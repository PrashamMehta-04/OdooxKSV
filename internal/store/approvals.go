package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"vendorbridge/internal/domain"
)

type ApprovalDecisionRequest struct {
	Status  string `json:"status"`
	Remarks string `json:"remarks"`
}

func (s *Store) insertApprovalChain(ctx context.Context, tx *sql.Tx, quotationID, actorID string) error {
	levels := []string{"L1 Review", "L2 approval"}
	for _, level := range levels {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO approvals (quotation_id, level, status)
			VALUES ($1::uuid, $2, 'pending')
		`, quotationID, level); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) ListApprovals(ctx context.Context, status string, limit, offset int) ([]domain.Approval, error) {
	query := `
		SELECT a.id::text, a.quotation_id::text, COALESCE(a.approver_id::text, ''), a.level, a.status, COALESCE(a.remarks, ''), a.approved_at, a.created_at, a.updated_at, r.title as rfq_title, v.name as vendor_name
		FROM approvals a
		INNER JOIN quotations q ON q.id = a.quotation_id
		INNER JOIN rfqs r ON r.id = q.rfq_id
		INNER JOIN vendors v ON v.id = q.vendor_id
		WHERE 1=1
	`
	args := make([]any, 0, 3)
	idx := 1
	if status != "" {
		query += fmt.Sprintf(" AND a.status = $%d", idx)
		args = append(args, status)
		idx++
	}
	query += " ORDER BY a.created_at DESC"
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", idx)
		args = append(args, limit)
		idx++
	}
	if offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", idx)
		args = append(args, offset)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	approvals := make([]domain.Approval, 0)
	for rows.Next() {
		var approval domain.Approval
		var approvedAt sql.NullTime
		if err := rows.Scan(&approval.ID, &approval.QuotationID, &approval.ApproverID, &approval.Level, &approval.Status, &approval.Remarks, &approvedAt, &approval.CreatedAt, &approval.UpdatedAt, &approval.RFQTitle, &approval.VendorName); err != nil {
			return nil, err
		}
		approval.ApprovedAt = parseTimePtr(approvedAt)
		approvals = append(approvals, approval)
	}
	return approvals, rows.Err()
}

func (s *Store) ListPendingApprovals(ctx context.Context, limit, offset int) ([]domain.Approval, error) {
	return s.ListApprovals(ctx, "pending", limit, offset)
}

func (s *Store) GetApproval(ctx context.Context, id string) (domain.Approval, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT a.id::text, a.quotation_id::text, COALESCE(a.approver_id::text, ''), a.level, a.status, COALESCE(a.remarks, ''), a.approved_at, a.created_at, a.updated_at, r.title as rfq_title, v.name as vendor_name
		FROM approvals a
		INNER JOIN quotations q ON q.id = a.quotation_id
		INNER JOIN rfqs r ON r.id = q.rfq_id
		INNER JOIN vendors v ON v.id = q.vendor_id
		WHERE a.id = $1::uuid
	`, id)
	var approval domain.Approval
	var approvedAt sql.NullTime
	if err := row.Scan(&approval.ID, &approval.QuotationID, &approval.ApproverID, &approval.Level, &approval.Status, &approval.Remarks, &approvedAt, &approval.CreatedAt, &approval.UpdatedAt, &approval.RFQTitle, &approval.VendorName); err != nil {
		return domain.Approval{}, err
	}
	approval.ApprovedAt = parseTimePtr(approvedAt)
	return approval, nil
}

func (s *Store) DecideApproval(ctx context.Context, approvalID, approverID string, req ApprovalDecisionRequest, actorID string) (domain.Approval, *domain.PurchaseOrder, *domain.Invoice, error) {
	var updated domain.Approval
	var po *domain.PurchaseOrder
	var inv *domain.Invoice

	err := s.withTx(ctx, func(tx *sql.Tx) error {
		now := time.Now().UTC()
		row := tx.QueryRowContext(ctx, `
			UPDATE approvals
			SET approver_id = $2::uuid, status = $3, remarks = NULLIF($4, ''), approved_at = CASE WHEN $3 = 'approved' THEN NOW() ELSE approved_at END, updated_at = NOW()
			WHERE id = $1::uuid
			RETURNING id::text, quotation_id::text, COALESCE(approver_id::text, ''), level, status, COALESCE(remarks, ''), approved_at, created_at, updated_at
		`, approvalID, approverID, req.Status, req.Remarks)
		var approvedAt sql.NullTime
		if err := row.Scan(&updated.ID, &updated.QuotationID, &updated.ApproverID, &updated.Level, &updated.Status, &updated.Remarks, &approvedAt, &updated.CreatedAt, &updated.UpdatedAt); err != nil {
			return err
		}
		updated.ApprovedAt = parseTimePtr(approvedAt)

		if err := s.insertActivity(ctx, tx, actorID, "approval", updated.ID, "approval.decided", map[string]any{"status": updated.Status, "level": updated.Level, "remark": updated.Remarks}); err != nil {
			return err
		}

		if updated.Status == "rejected" {
			_, err := tx.ExecContext(ctx, `UPDATE quotations SET status = 'rejected', updated_at = NOW() WHERE id = $1::uuid`, updated.QuotationID)
			_ = s.NotifyVendorTx(ctx, tx, getVendorIDFromQuotation(ctx, tx, updated.QuotationID), "Quotation Rejected", "Your quotation has been rejected.", "vendor-submissions")
			return err
		}

		var pendingCount int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*)
			FROM approvals
			WHERE quotation_id = $1::uuid AND status = 'pending'
		`, updated.QuotationID).Scan(&pendingCount); err != nil {
			return err
		}

		if pendingCount == 0 {
			if _, err := tx.ExecContext(ctx, `UPDATE quotations SET status = 'approved', updated_at = NOW() WHERE id = $1::uuid`, updated.QuotationID); err != nil {
				return err
			}
			if _, err := tx.ExecContext(ctx, `
				UPDATE rfqs SET status = 'approved', updated_at = NOW() 
				WHERE id = (SELECT rfq_id FROM quotations WHERE id = $1::uuid)
			`, updated.QuotationID); err != nil {
				return err
			}
			generatedPO, generatedInvoice, err := s.createPurchaseOrderAndInvoice(ctx, tx, updated.QuotationID, actorID, now)
			if err != nil {
				return err
			}
			po = generatedPO
			inv = generatedInvoice
			
			_ = s.NotifyVendorTx(ctx, tx, po.VendorID, "Quotation Approved", "Your quotation has been approved and a PO generated.", "purchase-orders")
		}

		return nil
	})

	return updated, po, inv, err
}

func getVendorIDFromQuotation(ctx context.Context, tx *sql.Tx, qID string) string {
	var vid string
	_ = tx.QueryRowContext(ctx, "SELECT vendor_id FROM quotations WHERE id = $1::uuid", qID).Scan(&vid)
	return vid
}
