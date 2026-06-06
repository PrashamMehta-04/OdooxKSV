package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"vendorbridge/internal/domain"
)

type CreateRFQParams struct {
	Title       string
	Description string
	Category    string
	Deadline    *string
	Status      string
	CreatedBy   string
}

type RFQLineItemInput struct {
	ItemName string  `json:"item_name"`
	Quantity float64 `json:"quantity"`
	Unit     string  `json:"unit"`
}

type RFQAttachmentInput struct {
	FileName string `json:"file_name"`
	FileURL  string `json:"file_url"`
}

type RFQCreateRequest struct {
	Title       string
	Description string
	Category    string
	Deadline    *string
	Status      string
	CreatedBy   string
	LineItems   []RFQLineItemInput
	VendorIDs   []string
	Attachments []RFQAttachmentInput
}

type RFQFilters struct {
	Status   string
	Search   string
	VendorID string
	Limit    int
	Offset   int
}

func (s *Store) CreateRFQ(ctx context.Context, req RFQCreateRequest, actorID string) (domain.RFQ, error) {
	if req.Status == "" {
		req.Status = "draft"
	}

	var rfq domain.RFQ
	err := s.withTx(ctx, func(tx *sql.Tx) error {
		var deadline sql.NullTime
		row := tx.QueryRowContext(ctx, `
			INSERT INTO rfqs (title, description, category, deadline, status, created_by)
			VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, '')::timestamptz, $5, NULLIF($6, '')::uuid)
			RETURNING id::text, title, COALESCE(description, ''), COALESCE(category, ''), deadline, status, COALESCE(created_by::text, ''), created_at, updated_at
		`, req.Title, req.Description, req.Category, req.Deadline, req.Status, req.CreatedBy)
		if err := row.Scan(&rfq.ID, &rfq.Title, &rfq.Description, &rfq.Category, &deadline, &rfq.Status, &rfq.CreatedBy, &rfq.CreatedAt, &rfq.UpdatedAt); err != nil {
			return err
		}
		rfq.Deadline = parseTimePtr(deadline)

		if err := insertRFQLineItems(ctx, tx, rfq.ID, req.LineItems); err != nil {
			return err
		}
		if err := s.insertRFQVendors(ctx, tx, rfq.ID, req.VendorIDs); err != nil {
			return err
		}
		if err := insertRFQAttachments(ctx, tx, rfq.ID, req.Attachments); err != nil {
			return err
		}
		if err := s.insertActivity(ctx, tx, actorID, "rfq", rfq.ID, "rfq.created", map[string]any{"title": rfq.Title}); err != nil {
			return err
		}
		return nil
	})

	return rfq, err
}

func (s *Store) GetRFQ(ctx context.Context, id string) (domain.RFQ, []domain.RFQLineItem, []domain.RFQAttachment, []domain.Vendor, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id::text, title, COALESCE(description, ''), COALESCE(category, ''), deadline, status, COALESCE(created_by::text, ''), created_at, updated_at
		FROM rfqs
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id)

	var rfq domain.RFQ
	var deadline sql.NullTime
	if err := row.Scan(&rfq.ID, &rfq.Title, &rfq.Description, &rfq.Category, &deadline, &rfq.Status, &rfq.CreatedBy, &rfq.CreatedAt, &rfq.UpdatedAt); err != nil {
		return domain.RFQ{}, nil, nil, nil, err
	}
	rfq.Deadline = parseTimePtr(deadline)

	items, err := s.listRFQLineItems(ctx, id)
	if err != nil {
		return domain.RFQ{}, nil, nil, nil, err
	}
	attachments, err := s.listRFQAttachments(ctx, id)
	if err != nil {
		return domain.RFQ{}, nil, nil, nil, err
	}
	vendors, err := s.listRFQVendors(ctx, id)
	if err != nil {
		return domain.RFQ{}, nil, nil, nil, err
	}

	return rfq, items, attachments, vendors, nil
}

func (s *Store) ListRFQs(ctx context.Context, filters RFQFilters) ([]domain.RFQ, error) {
	query := `
		SELECT r.id::text, r.title, COALESCE(r.description, ''), COALESCE(r.category, ''), r.deadline, r.status, COALESCE(r.created_by::text, ''), r.created_at, r.updated_at
		FROM rfqs r
	`
	args := make([]any, 0, 5)
	where := []string{"r.deleted_at IS NULL"}

	if filters.VendorID != "" {
		query += " INNER JOIN rfq_vendor_assignments a ON a.rfq_id = r.id"
		where = append(where, fmt.Sprintf("a.vendor_id = $%d::uuid", len(args)+1))
		args = append(args, filters.VendorID)
	}

	if filters.Search != "" {
		idx := len(args) + 1
		where = append(where, fmt.Sprintf("(LOWER(r.title) LIKE LOWER($%d) OR LOWER(COALESCE(r.description, '')) LIKE LOWER($%d) OR LOWER(COALESCE(r.category, '')) LIKE LOWER($%d))", idx, idx, idx))
		args = append(args, "%"+strings.TrimSpace(filters.Search)+"%")
	}

	if filters.Status != "" {
		where = append(where, fmt.Sprintf("r.status = $%d", len(args)+1))
		args = append(args, filters.Status)
	}

	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}

	query += " ORDER BY r.created_at DESC"

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", len(args)+1)
		args = append(args, filters.Limit)
	}

	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", len(args)+1)
		args = append(args, filters.Offset)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.RFQ, 0)
	for rows.Next() {
		var rfq domain.RFQ
		var deadline sql.NullTime
		if err := rows.Scan(&rfq.ID, &rfq.Title, &rfq.Description, &rfq.Category, &deadline, &rfq.Status, &rfq.CreatedBy, &rfq.CreatedAt, &rfq.UpdatedAt); err != nil {
			return nil, err
		}
		rfq.Deadline = parseTimePtr(deadline)
		items = append(items, rfq)
	}
	return items, rows.Err()
}

func (s *Store) AddRFQLineItems(ctx context.Context, rfqID string, items []RFQLineItemInput, actorID string) error {
	return s.withTx(ctx, func(tx *sql.Tx) error {
		if err := insertRFQLineItems(ctx, tx, rfqID, items); err != nil {
			return err
		}
		return s.insertActivity(ctx, tx, actorID, "rfq", rfqID, "rfq.line_items.added", map[string]any{"count": len(items)})
	})
}

func (s *Store) AssignRFQVendors(ctx context.Context, rfqID string, vendorIDs []string, actorID string) error {
	return s.withTx(ctx, func(tx *sql.Tx) error {
		if err := s.insertRFQVendors(ctx, tx, rfqID, vendorIDs); err != nil {
			return err
		}
		return s.insertActivity(ctx, tx, actorID, "rfq", rfqID, "rfq.vendors.assigned", map[string]any{"count": len(vendorIDs)})
	})
}

func (s *Store) AddRFQAttachments(ctx context.Context, rfqID string, attachments []RFQAttachmentInput, actorID string) error {
	return s.withTx(ctx, func(tx *sql.Tx) error {
		if err := insertRFQAttachments(ctx, tx, rfqID, attachments); err != nil {
			return err
		}
		return s.insertActivity(ctx, tx, actorID, "rfq", rfqID, "rfq.attachments.added", map[string]any{"count": len(attachments)})
	})
}

func insertRFQLineItems(ctx context.Context, tx *sql.Tx, rfqID string, items []RFQLineItemInput) error {
	for _, item := range items {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO rfq_line_items (rfq_id, item_name, quantity, unit)
			VALUES ($1::uuid, $2, $3, $4)
		`, rfqID, item.ItemName, item.Quantity, item.Unit); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) insertRFQVendors(ctx context.Context, tx *sql.Tx, rfqID string, vendorIDs []string) error {
	for _, vid := range vendorIDs {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO rfq_vendor_assignments (rfq_id, vendor_id)
			VALUES ($1::uuid, $2::uuid)
			ON CONFLICT DO NOTHING
		`, rfqID, vid); err != nil {
			return err
		}
		_ = s.NotifyVendorTx(ctx, tx, vid, "New RFQ Assigned", "You have been invited to participate in a new RFQ.", "vendor-submissions")
	}

	return nil
}

func insertRFQAttachments(ctx context.Context, tx *sql.Tx, rfqID string, attachments []RFQAttachmentInput) error {
	for _, attachment := range attachments {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO rfq_attachments (rfq_id, file_name, file_url)
			VALUES ($1::uuid, $2, $3)
		`, rfqID, attachment.FileName, attachment.FileURL); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) listRFQLineItems(ctx context.Context, rfqID string) ([]domain.RFQLineItem, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, rfq_id::text, item_name, quantity, unit, created_at, updated_at
		FROM rfq_line_items
		WHERE rfq_id = $1::uuid
		ORDER BY created_at ASC
	`, rfqID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.RFQLineItem, 0)
	for rows.Next() {
		var item domain.RFQLineItem
		if err := rows.Scan(&item.ID, &item.RFQID, &item.ItemName, &item.Quantity, &item.Unit, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) listRFQAttachments(ctx context.Context, rfqID string) ([]domain.RFQAttachment, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, rfq_id::text, file_name, file_url, created_at
		FROM rfq_attachments
		WHERE rfq_id = $1::uuid
		ORDER BY created_at ASC
	`, rfqID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.RFQAttachment, 0)
	for rows.Next() {
		var item domain.RFQAttachment
		if err := rows.Scan(&item.ID, &item.RFQID, &item.FileName, &item.FileURL, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) listRFQVendors(ctx context.Context, rfqID string) ([]domain.Vendor, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT v.id::text, v.name, COALESCE(v.gst_number, ''), COALESCE(v.category, ''), COALESCE(v.contact_number, ''), COALESCE(v.email, ''), COALESCE(v.country, ''), v.status, COALESCE(v.notes, ''), v.created_at, v.updated_at
		FROM vendors v
		INNER JOIN rfq_vendor_assignments a ON a.vendor_id = v.id
		WHERE a.rfq_id = $1::uuid AND v.deleted_at IS NULL
		ORDER BY v.created_at ASC
	`, rfqID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	vendors := make([]domain.Vendor, 0)
	for rows.Next() {
		vendor, err := scanVendor(rows)
		if err != nil {
			return nil, err
		}
		vendors = append(vendors, vendor)
	}
	return vendors, rows.Err()
}
