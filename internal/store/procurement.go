package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"vendorbridge/internal/domain"
)

func (s *Store) createPurchaseOrderAndInvoice(ctx context.Context, tx *sql.Tx, quotationID, actorID string, now time.Time) (*domain.PurchaseOrder, *domain.Invoice, error) {
	q, items, err := s.getQuotationTx(ctx, tx, quotationID)
	if err != nil {
		return nil, nil, err
	}

	poNumber, err := randomNumber("PO")
	if err != nil {
		return nil, nil, err
	}

	subtotal := q.TotalAmount
	gstAmount := subtotal * (q.GSTPercent / 100)
	grandTotal := subtotal + gstAmount

	var po domain.PurchaseOrder
	var poDate sql.NullTime
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO purchase_orders (po_number, rfq_id, quotation_id, vendor_id, status, subtotal, gst_amount, grand_total, po_date)
		VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'approved', $5, $6, $7, $8::date)
		RETURNING id::text, po_number, COALESCE(rfq_id::text, ''), COALESCE(quotation_id::text, ''), COALESCE(vendor_id::text, ''), status, subtotal, gst_amount, grand_total, po_date, created_at, updated_at
	`, poNumber, q.RFQID, q.ID, q.VendorID, subtotal, gstAmount, grandTotal, now.Format("2006-01-02")).Scan(&po.ID, &po.PONumber, &po.RFQID, &po.QuotationID, &po.VendorID, &po.Status, &po.Subtotal, &po.GSTAmount, &po.GrandTotal, &poDate, &po.CreatedAt, &po.UpdatedAt); err != nil {
		return nil, nil, err
	}
	po.PODate = parseTimePtr(poDate)

	if err := insertPOLineItems(ctx, tx, po.ID, items); err != nil {
		return nil, nil, err
	}

	invoiceNumber, err := randomNumber("INV")
	if err != nil {
		return nil, nil, err
	}
	dueDateValue := now.AddDate(0, 0, 30)

	var inv domain.Invoice
	var invoiceDate sql.NullTime
	var invoiceDueDate sql.NullTime
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO invoices (invoice_number, po_id, vendor_id, invoice_date, due_date, subtotal, gst_amount, grand_total, status)
		VALUES ($1, $2::uuid, $3::uuid, $4::date, $5::date, $6, $7, $8, 'issued')
		RETURNING id::text, invoice_number, po_id::text, COALESCE(vendor_id::text, ''), invoice_date, due_date, subtotal, gst_amount, grand_total, status, created_at, updated_at
	`, invoiceNumber, po.ID, q.VendorID, now.Format("2006-01-02"), dueDateValue.Format("2006-01-02"), subtotal, gstAmount, grandTotal).Scan(&inv.ID, &inv.InvoiceNumber, &inv.POID, &inv.VendorID, &invoiceDate, &invoiceDueDate, &inv.Subtotal, &inv.GSTAmount, &inv.GrandTotal, &inv.Status, &inv.CreatedAt, &inv.UpdatedAt); err != nil {
		return nil, nil, err
	}
	inv.InvoiceDate = parseTimePtr(invoiceDate)
	inv.DueDate = parseTimePtr(invoiceDueDate)

	if err := insertInvoiceLineItems(ctx, tx, inv.ID, items); err != nil {
		return nil, nil, err
	}

	if err := s.insertActivity(ctx, tx, actorID, "purchase_order", po.ID, "purchase_order.created", map[string]any{"po_number": po.PONumber, "quotation_id": q.ID}); err != nil {
		return nil, nil, err
	}
	if err := s.insertActivity(ctx, tx, actorID, "invoice", inv.ID, "invoice.created", map[string]any{"invoice_number": inv.InvoiceNumber, "po_id": po.ID}); err != nil {
		return nil, nil, err
	}

	return &po, &inv, nil
}

func (s *Store) getQuotationTx(ctx context.Context, tx *sql.Tx, id string) (domain.Quotation, []domain.QuotationLineItem, error) {
	row := tx.QueryRowContext(ctx, `
		SELECT id::text, rfq_id::text, vendor_id::text, total_amount, COALESCE(delivery_days, 0), COALESCE(rating, 0), COALESCE(payment_terms, ''), COALESCE(gst_percent, 0), status, selected, created_at, updated_at
		FROM quotations
		WHERE id = $1::uuid
	`, id)
	var q domain.Quotation
	if err := row.Scan(&q.ID, &q.RFQID, &q.VendorID, &q.TotalAmount, &q.DeliveryDays, &q.Rating, &q.PaymentTerms, &q.GSTPercent, &q.Status, &q.Selected, &q.CreatedAt, &q.UpdatedAt); err != nil {
		return domain.Quotation{}, nil, err
	}
	items, err := listQuotationLineItemsTx(ctx, tx, id)
	if err != nil {
		return domain.Quotation{}, nil, err
	}
	return q, items, nil
}

func listQuotationLineItemsTx(ctx context.Context, tx *sql.Tx, quotationID string) ([]domain.QuotationLineItem, error) {
	rows, err := tx.QueryContext(ctx, `
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

func insertPOLineItems(ctx context.Context, tx *sql.Tx, poID string, items []domain.QuotationLineItem) error {
	for _, item := range items {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO po_line_items (po_id, item_name, quantity, unit_price, total_amount)
			VALUES ($1::uuid, $2, $3, $4, $5)
		`, poID, item.ItemName, item.Quantity, item.UnitPrice, item.TotalAmount); err != nil {
			return err
		}
	}
	return nil
}

func insertInvoiceLineItems(ctx context.Context, tx *sql.Tx, invoiceID string, items []domain.QuotationLineItem) error {
	for _, item := range items {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO invoice_line_items (invoice_id, item_name, quantity, unit_price, total_amount)
			VALUES ($1::uuid, $2, $3, $4, $5)
		`, invoiceID, item.ItemName, item.Quantity, item.UnitPrice, item.TotalAmount); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) ListPurchaseOrders(ctx context.Context, vendorID string, limit, offset int) ([]domain.PurchaseOrder, error) {
	query := `
		SELECT 
			p.id::text, p.po_number, COALESCE(p.rfq_id::text, ''), COALESCE(p.quotation_id::text, ''), 
			COALESCE(p.vendor_id::text, ''), p.status, p.subtotal, p.gst_amount, p.grand_total, p.po_date, 
			p.created_at, p.updated_at, r.title as rfq_title, v.name as vendor_name
		FROM purchase_orders p
		INNER JOIN rfqs r ON r.id = p.rfq_id
		INNER JOIN vendors v ON v.id = p.vendor_id
		WHERE p.deleted_at IS NULL
	`
	args := []any{}
	idx := 1
	if vendorID != "" {
		query += fmt.Sprintf(" AND p.vendor_id = $%d::uuid", idx)
		args = append(args, vendorID)
		idx++
	}
	query += " ORDER BY p.created_at DESC"
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

	items := make([]domain.PurchaseOrder, 0)
	for rows.Next() {
		var po domain.PurchaseOrder
		var poDate sql.NullTime
		if err := rows.Scan(&po.ID, &po.PONumber, &po.RFQID, &po.QuotationID, &po.VendorID, &po.Status, &po.Subtotal, &po.GSTAmount, &po.GrandTotal, &poDate, &po.CreatedAt, &po.UpdatedAt, &po.RFQTitle, &po.VendorName); err != nil {
			return nil, err
		}
		po.PODate = parseTimePtr(poDate)
		items = append(items, po)
	}
	return items, rows.Err()
}

func (s *Store) GetPurchaseOrder(ctx context.Context, id string) (domain.PurchaseOrder, []domain.QuotationLineItem, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT 
			p.id::text, p.po_number, COALESCE(p.rfq_id::text, ''), COALESCE(p.quotation_id::text, ''), 
			COALESCE(p.vendor_id::text, ''), p.status, p.subtotal, p.gst_amount, p.grand_total, p.po_date, 
			p.created_at, p.updated_at, r.title as rfq_title, v.name as vendor_name
		FROM purchase_orders p
		INNER JOIN rfqs r ON r.id = p.rfq_id
		INNER JOIN vendors v ON v.id = p.vendor_id
		WHERE p.id = $1::uuid AND p.deleted_at IS NULL
	`, id)
	var po domain.PurchaseOrder
	var poDate sql.NullTime
	if err := row.Scan(&po.ID, &po.PONumber, &po.RFQID, &po.QuotationID, &po.VendorID, &po.Status, &po.Subtotal, &po.GSTAmount, &po.GrandTotal, &poDate, &po.CreatedAt, &po.UpdatedAt, &po.RFQTitle, &po.VendorName); err != nil {
		return domain.PurchaseOrder{}, nil, err
	}
	po.PODate = parseTimePtr(poDate)
	items, err := s.listPOLineItems(ctx, id)
	if err != nil {
		return domain.PurchaseOrder{}, nil, err
	}
	return po, items, nil
}

func (s *Store) listPOLineItems(ctx context.Context, poID string) ([]domain.QuotationLineItem, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, po_id::text, item_name, quantity, unit_price, total_amount, created_at
		FROM po_line_items
		WHERE po_id = $1::uuid
		ORDER BY created_at ASC
	`, poID)
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

func (s *Store) ListInvoices(ctx context.Context, vendorID string, limit, offset int) ([]domain.Invoice, error) {
	query := `
		SELECT 
			i.id::text, i.invoice_number, i.po_id::text, COALESCE(i.vendor_id::text, ''), i.invoice_date, 
			i.due_date, i.subtotal, i.gst_amount, i.grand_total, i.status, i.created_at, i.updated_at,
			r.title as rfq_title, v.name as vendor_name
		FROM invoices i
		INNER JOIN purchase_orders p ON p.id = i.po_id
		INNER JOIN rfqs r ON r.id = p.rfq_id
		INNER JOIN vendors v ON v.id = i.vendor_id
		WHERE i.deleted_at IS NULL
	`
	args := []any{}
	idx := 1
	if vendorID != "" {
		query += fmt.Sprintf(" AND i.vendor_id = $%d::uuid", idx)
		args = append(args, vendorID)
		idx++
	}
	query += " ORDER BY i.created_at DESC"
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

	items := make([]domain.Invoice, 0)
	for rows.Next() {
		var invoice domain.Invoice
		var invoiceDate sql.NullTime
		var invoiceDueDate sql.NullTime
		if err := rows.Scan(&invoice.ID, &invoice.InvoiceNumber, &invoice.POID, &invoice.VendorID, &invoiceDate, &invoiceDueDate, &invoice.Subtotal, &invoice.GSTAmount, &invoice.GrandTotal, &invoice.Status, &invoice.CreatedAt, &invoice.UpdatedAt, &invoice.RFQTitle, &invoice.VendorName); err != nil {
			return nil, err
		}
		invoice.InvoiceDate = parseTimePtr(invoiceDate)
		invoice.DueDate = parseTimePtr(invoiceDueDate)
		items = append(items, invoice)
	}
	return items, rows.Err()
}

func (s *Store) GetInvoice(ctx context.Context, id string) (domain.Invoice, []domain.QuotationLineItem, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT 
			i.id::text, i.invoice_number, i.po_id::text, COALESCE(i.vendor_id::text, ''), i.invoice_date, 
			i.due_date, i.subtotal, i.gst_amount, i.grand_total, i.status, i.created_at, i.updated_at,
			r.title as rfq_title, v.name as vendor_name
		FROM invoices i
		INNER JOIN purchase_orders p ON p.id = i.po_id
		INNER JOIN rfqs r ON r.id = p.rfq_id
		INNER JOIN vendors v ON v.id = i.vendor_id
		WHERE i.id = $1::uuid AND i.deleted_at IS NULL
	`, id)
	var invoice domain.Invoice
	var invoiceDate sql.NullTime
	var invoiceDueDate sql.NullTime
	if err := row.Scan(&invoice.ID, &invoice.InvoiceNumber, &invoice.POID, &invoice.VendorID, &invoiceDate, &invoiceDueDate, &invoice.Subtotal, &invoice.GSTAmount, &invoice.GrandTotal, &invoice.Status, &invoice.CreatedAt, &invoice.UpdatedAt, &invoice.RFQTitle, &invoice.VendorName); err != nil {
		return domain.Invoice{}, nil, err
	}
	invoice.InvoiceDate = parseTimePtr(invoiceDate)
	invoice.DueDate = parseTimePtr(invoiceDueDate)
	items, err := s.listInvoiceLineItems(ctx, id)
	if err != nil {
		return domain.Invoice{}, nil, err
	}
	return invoice, items, nil
}

func (s *Store) listInvoiceLineItems(ctx context.Context, invoiceID string) ([]domain.QuotationLineItem, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, invoice_id::text, item_name, quantity, unit_price, total_amount, created_at
		FROM invoice_line_items
		WHERE invoice_id = $1::uuid
		ORDER BY created_at ASC
	`, invoiceID)
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

func (s *Store) MarkInvoiceSent(ctx context.Context, id, actorID string) (domain.Invoice, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE invoices SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid AND deleted_at IS NULL
		RETURNING id::text, invoice_number, po_id::text, COALESCE(vendor_id::text, ''), invoice_date, due_date, subtotal, gst_amount, grand_total, status, created_at, updated_at
	`, id)
	var invoice domain.Invoice
	var invoiceDate sql.NullTime
	var invoiceDueDate sql.NullTime
	if err := row.Scan(&invoice.ID, &invoice.InvoiceNumber, &invoice.POID, &invoice.VendorID, &invoiceDate, &invoiceDueDate, &invoice.Subtotal, &invoice.GSTAmount, &invoice.GrandTotal, &invoice.Status, &invoice.CreatedAt, &invoice.UpdatedAt); err != nil {
		return domain.Invoice{}, err
	}
	invoice.InvoiceDate = parseTimePtr(invoiceDate)
	invoice.DueDate = parseTimePtr(invoiceDueDate)
	_ = s.insertActivity(ctx, s.db, actorID, "invoice", invoice.ID, "invoice.sent", nil)
	return invoice, nil
}

func (s *Store) GetDashboardMetrics(ctx context.Context) (domain.DashboardMetrics, error) {
	var metrics domain.DashboardMetrics
	err := s.db.QueryRowContext(ctx, `
		SELECT
			COALESCE((SELECT SUM(grand_total) FROM invoices WHERE deleted_at IS NULL), 0),
			COALESCE((SELECT COUNT(*) FROM rfqs WHERE deleted_at IS NULL AND status IN ('draft', 'submitted', 'selected', 'approved')), 0),
			COALESCE((SELECT COUNT(*) FROM approvals WHERE status = 'pending'), 0),
			COALESCE((SELECT COUNT(*) FROM purchase_orders WHERE deleted_at IS NULL AND date_trunc('month', created_at) = date_trunc('month', NOW())), 0),
			COALESCE((SELECT COUNT(*) FROM invoices WHERE deleted_at IS NULL AND due_date < CURRENT_DATE AND status <> 'paid'), 0)
	`).Scan(&metrics.TotalSpend, &metrics.ActiveRFQs, &metrics.PendingApprovals, &metrics.POsThisMonth, &metrics.OverdueInvoices)
	return metrics, err
}

func (s *Store) GetSpendTrend(ctx context.Context, months int) ([]domain.SpendTrendPoint, error) {
	if months <= 0 {
		months = 6
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT to_char(date_trunc('month', COALESCE(invoice_date, created_at)), 'YYYY-MM') AS month,
		       COALESCE(SUM(grand_total), 0) AS amount
		FROM invoices
		WHERE deleted_at IS NULL
		  AND COALESCE(invoice_date, created_at) >= date_trunc('month', NOW()) - ($1::int || ' months')::interval
		GROUP BY 1
		ORDER BY 1 ASC
	`, months)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	points := make([]domain.SpendTrendPoint, 0)
	for rows.Next() {
		var point domain.SpendTrendPoint
		if err := rows.Scan(&point.Month, &point.Amount); err != nil {
			return nil, err
		}
		points = append(points, point)
	}
	return points, rows.Err()
}

func (s *Store) ListActivity(ctx context.Context, limit, offset int) ([]domain.ActivityLog, error) {
	query := `
		SELECT id::text, COALESCE(actor_id::text, ''), entity_type, COALESCE(entity_id::text, ''), action, metadata, created_at
		FROM activity_logs
		ORDER BY created_at DESC
	`
	args := []any{}
	if limit > 0 {
		query += " LIMIT $1"
		args = append(args, limit)
		if offset > 0 {
			query += " OFFSET $2"
			args = append(args, offset)
		}
	} else if offset > 0 {
		query += " OFFSET $1"
		args = append(args, offset)
	}
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.ActivityLog, 0)
	for rows.Next() {
		var payload []byte
		var item domain.ActivityLog
		if err := rows.Scan(&item.ID, &item.ActorID, &item.EntityType, &item.EntityID, &item.Action, &payload, &item.CreatedAt); err != nil {
			return nil, err
		}
		if len(payload) > 0 {
			_ = json.Unmarshal(payload, &item.Metadata)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) InsertActivity(ctx context.Context, actorID, entityType, entityID, action string, metadata map[string]any) error {
	return s.insertActivity(ctx, s.db, actorID, entityType, entityID, action, metadata)
}
