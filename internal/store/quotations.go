package store

import (
	"context"
	"database/sql"
	"fmt"

	"vendorbridge/internal/domain"
)

type QuotationLineItemInput struct {
	ItemName    string  `json:"item_name"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	TotalAmount float64 `json:"total_amount"`
}

type CreateQuotationRequest struct {
	RFQID        string
	VendorID     string
	TotalAmount  float64
	DeliveryDays int
	Rating       float64
	PaymentTerms string
	GSTPercent   float64
	Status       string
	Selected     bool
	LineItems    []QuotationLineItemInput
}

type QuotationFilters struct {
	RFQID    string
	VendorID string
	Status   string
	Limit    int
	Offset   int
}

func (s *Store) CreateQuotation(ctx context.Context, req CreateQuotationRequest, actorID string) (domain.Quotation, error) {
	if req.Status == "" {
		req.Status = "submitted"
	}
	var q domain.Quotation
	err := s.withTx(ctx, func(tx *sql.Tx) error {
		row := tx.QueryRowContext(ctx, `
			INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, rating, payment_terms, gst_percent, status, selected)
			VALUES ($1::uuid, $2::uuid, $3, NULLIF($4, 0), NULLIF($5, 0), NULLIF($6, ''), NULLIF($7, 0), $8, $9)
			RETURNING id::text, rfq_id::text, vendor_id::text, total_amount, COALESCE(delivery_days, 0), COALESCE(rating, 0), COALESCE(payment_terms, ''), COALESCE(gst_percent, 0), status, selected, created_at, updated_at
		`, req.RFQID, req.VendorID, req.TotalAmount, req.DeliveryDays, req.Rating, req.PaymentTerms, req.GSTPercent, req.Status, req.Selected)
		if err := row.Scan(&q.ID, &q.RFQID, &q.VendorID, &q.TotalAmount, &q.DeliveryDays, &q.Rating, &q.PaymentTerms, &q.GSTPercent, &q.Status, &q.Selected, &q.CreatedAt, &q.UpdatedAt); err != nil {
			return err
		}
		if err := insertQuotationLineItems(ctx, tx, q.ID, req.LineItems); err != nil {
			return err
		}
		_ = s.NotifyRoleTx(ctx, tx, "officer", "New Quotation", "A vendor has submitted a quotation for an RFQ.", "quotations")
		return s.insertActivity(ctx, tx, actorID, "quotation", q.ID, "quotation.submitted", map[string]any{"rfq_id": q.RFQID, "vendor_id": q.VendorID, "amount": q.TotalAmount})
	})
	return q, err
}

func (s *Store) ListQuotations(ctx context.Context, filters QuotationFilters) ([]domain.Quotation, error) {
	query := `
		SELECT id::text, rfq_id::text, vendor_id::text, total_amount, COALESCE(delivery_days, 0), COALESCE(rating, 0), COALESCE(payment_terms, ''), COALESCE(gst_percent, 0), status, selected, created_at, updated_at
		FROM quotations
		WHERE deleted_at IS NULL
	`
	args := make([]any, 0, 5)
	idx := 1
	if filters.RFQID != "" {
		query += fmt.Sprintf(" AND rfq_id = $%d::uuid", idx)
		args = append(args, filters.RFQID)
		idx++
	}
	if filters.VendorID != "" {
		query += fmt.Sprintf(" AND vendor_id = $%d::uuid", idx)
		args = append(args, filters.VendorID)
		idx++
	}
	if filters.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", idx)
		args = append(args, filters.Status)
		idx++
	}
	query += " ORDER BY created_at DESC"
	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", idx)
		args = append(args, filters.Limit)
		idx++
	}
	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", idx)
		args = append(args, filters.Offset)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	quotations := make([]domain.Quotation, 0)
	for rows.Next() {
		var q domain.Quotation
		if err := rows.Scan(&q.ID, &q.RFQID, &q.VendorID, &q.TotalAmount, &q.DeliveryDays, &q.Rating, &q.PaymentTerms, &q.GSTPercent, &q.Status, &q.Selected, &q.CreatedAt, &q.UpdatedAt); err != nil {
			return nil, err
		}
		quotations = append(quotations, q)
	}
	return quotations, rows.Err()
}

func (s *Store) GetQuotation(ctx context.Context, id string) (domain.Quotation, []domain.QuotationLineItem, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id::text, rfq_id::text, vendor_id::text, total_amount, COALESCE(delivery_days, 0), COALESCE(rating, 0), COALESCE(payment_terms, ''), COALESCE(gst_percent, 0), status, selected, created_at, updated_at
		FROM quotations
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id)
	var q domain.Quotation
	if err := row.Scan(&q.ID, &q.RFQID, &q.VendorID, &q.TotalAmount, &q.DeliveryDays, &q.Rating, &q.PaymentTerms, &q.GSTPercent, &q.Status, &q.Selected, &q.CreatedAt, &q.UpdatedAt); err != nil {
		return domain.Quotation{}, nil, err
	}
	items, err := s.listQuotationLineItems(ctx, id)
	if err != nil {
		return domain.Quotation{}, nil, err
	}
	return q, items, nil
}

func (s *Store) SelectQuotation(ctx context.Context, quotationID, actorID string) (domain.Quotation, error) {
	var selected domain.Quotation
	err := s.withTx(ctx, func(tx *sql.Tx) error {
		row := tx.QueryRowContext(ctx, `
			UPDATE quotations
			SET selected = TRUE, status = 'selected', updated_at = NOW()
			WHERE id = $1::uuid AND deleted_at IS NULL
			RETURNING id::text, rfq_id::text, vendor_id::text, total_amount, COALESCE(delivery_days, 0), COALESCE(rating, 0), COALESCE(payment_terms, ''), COALESCE(gst_percent, 0), status, selected, created_at, updated_at
		`, quotationID)
		if err := row.Scan(&selected.ID, &selected.RFQID, &selected.VendorID, &selected.TotalAmount, &selected.DeliveryDays, &selected.Rating, &selected.PaymentTerms, &selected.GSTPercent, &selected.Status, &selected.Selected, &selected.CreatedAt, &selected.UpdatedAt); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE quotations SET status = CASE WHEN id = $1::uuid THEN 'selected' ELSE 'rejected' END, updated_at = NOW()
			WHERE rfq_id = (SELECT rfq_id FROM quotations WHERE id = $1::uuid)
		`, quotationID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE rfqs SET status = 'selected', updated_at = NOW()
			WHERE id = (SELECT rfq_id FROM quotations WHERE id = $1::uuid)
		`, quotationID); err != nil {
			return err
		}
		if err := s.insertApprovalChain(ctx, tx, selected.ID, actorID); err != nil {
			return err
		}
		return s.insertActivity(ctx, tx, actorID, "quotation", selected.ID, "quotation.selected", map[string]any{"rfq_id": selected.RFQID, "vendor_id": selected.VendorID})
	})
	return selected, err
}

func insertQuotationLineItems(ctx context.Context, tx *sql.Tx, quotationID string, items []QuotationLineItemInput) error {
	for _, item := range items {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO quotation_line_items (quotation_id, item_name, quantity, unit_price, total_amount)
			VALUES ($1::uuid, $2, $3, $4, $5)
		`, quotationID, item.ItemName, item.Quantity, item.UnitPrice, item.TotalAmount); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) listQuotationLineItems(ctx context.Context, quotationID string) ([]domain.QuotationLineItem, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, quotation_id::text, item_name, quantity, unit_price, total_amount, created_at
		FROM quotation_line_items
		WHERE quotation_id = $1::uuid
		ORDER BY created_at ASC
	`, quotationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.QuotationLineItem, 0)
	for rows.Next() {
		var item domain.QuotationLineItem
		if err := rows.Scan(&item.ID, &item.QuotationID, &item.ItemName, &item.Quantity, &item.UnitPrice, &item.TotalAmount, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) listQuotationByRFQ(ctx context.Context, rfqID string) ([]domain.Quotation, error) {
	return s.ListQuotations(ctx, QuotationFilters{RFQID: rfqID})
}

func (s *Store) quotationLineItemsFromQuotation(ctx context.Context, quotationID string) ([]domain.QuotationLineItem, error) {
	return s.listQuotationLineItems(ctx, quotationID)
}

func (s *Store) ApproveSelectedQuotation(ctx context.Context, quotationID string, actorID string) error {
	_, err := s.SelectQuotation(ctx, quotationID, actorID)
	return err
}
