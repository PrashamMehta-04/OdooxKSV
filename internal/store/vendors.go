package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"vendorbridge/internal/domain"
)

type VendorFilters struct {
	Search string
	Status string
	Limit  int
	Offset int
}

type CreateVendorParams struct {
	Name          string
	GSTNumber     string
	Category      string
	ContactNumber string
	Email         string
	Country       string
	Status        string
	Notes         string
}

type UpdateVendorParams struct {
	Name          string
	GSTNumber     string
	Category      string
	ContactNumber string
	Email         string
	Country       string
	Status        string
	Notes         string
}

func (s *Store) CreateVendor(ctx context.Context, params CreateVendorParams, actorID string) (domain.Vendor, error) {
	if params.Status == "" {
		params.Status = "pending"
	}
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO vendors (name, gst_number, category, contact_number, email, country, status, notes)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), $7, NULLIF($8, ''))
		RETURNING id::text, name, COALESCE(gst_number, ''), COALESCE(category, ''), COALESCE(contact_number, ''), COALESCE(email, ''), COALESCE(country, ''), status, COALESCE(notes, ''), created_at, updated_at
	`, params.Name, params.GSTNumber, params.Category, params.ContactNumber, params.Email, params.Country, params.Status, params.Notes)

	vendor, err := scanVendor(row)
	if err != nil {
		return domain.Vendor{}, err
	}
	_ = s.insertActivity(ctx, s.db, actorID, "vendor", vendor.ID, "vendor.created", map[string]any{"name": vendor.Name})
	return vendor, nil
}

func (s *Store) UpdateVendor(ctx context.Context, id string, params UpdateVendorParams, actorID string) (domain.Vendor, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE vendors
		SET name = COALESCE(NULLIF($2, ''), name),
		    gst_number = COALESCE(NULLIF($3, ''), gst_number),
		    category = COALESCE(NULLIF($4, ''), category),
		    contact_number = COALESCE(NULLIF($5, ''), contact_number),
		    email = COALESCE(NULLIF($6, ''), email),
		    country = COALESCE(NULLIF($7, ''), country),
		    status = COALESCE(NULLIF($8, ''), status),
		    notes = COALESCE(NULLIF($9, ''), notes),
		    updated_at = NOW()
		WHERE id = $1::uuid AND deleted_at IS NULL
		RETURNING id::text, name, COALESCE(gst_number, ''), COALESCE(category, ''), COALESCE(contact_number, ''), COALESCE(email, ''), COALESCE(country, ''), status, COALESCE(notes, ''), created_at, updated_at
	`, id, params.Name, params.GSTNumber, params.Category, params.ContactNumber, params.Email, params.Country, params.Status, params.Notes)

	vendor, err := scanVendor(row)
	if err != nil {
		return domain.Vendor{}, err
	}
	_ = s.insertActivity(ctx, s.db, actorID, "vendor", vendor.ID, "vendor.updated", map[string]any{"name": vendor.Name})
	return vendor, nil
}

func (s *Store) DeleteVendor(ctx context.Context, id, actorID string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE vendors SET deleted_at = NOW(), status = 'deleted', updated_at = NOW()
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id)
	if err == nil {
		_ = s.insertActivity(ctx, s.db, actorID, "vendor", id, "vendor.deleted", nil)
	}
	return err
}

func (s *Store) GetVendor(ctx context.Context, id string) (domain.Vendor, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id::text, name, COALESCE(gst_number, ''), COALESCE(category, ''), COALESCE(contact_number, ''), COALESCE(email, ''), COALESCE(country, ''), status, COALESCE(notes, ''), created_at, updated_at
		FROM vendors
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id)
	return scanVendor(row)
}

func (s *Store) ListVendors(ctx context.Context, filters VendorFilters) ([]domain.Vendor, error) {
	query := `
		SELECT id::text, name, COALESCE(gst_number, ''), COALESCE(category, ''), COALESCE(contact_number, ''), COALESCE(email, ''), COALESCE(country, ''), status, COALESCE(notes, ''), created_at, updated_at
		FROM vendors
		WHERE deleted_at IS NULL
	`
	args := make([]any, 0, 4)
	idx := 1
	if filters.Search != "" {
		query += fmt.Sprintf(" AND (LOWER(name) LIKE LOWER($%d) OR LOWER(COALESCE(gst_number, '')) LIKE LOWER($%d) OR LOWER(COALESCE(category, '')) LIKE LOWER($%d))", idx, idx, idx)
		term := "%" + strings.TrimSpace(filters.Search) + "%"
		args = append(args, term)
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

	return scanVendors(rows)
}

func scanVendor(row scanner) (domain.Vendor, error) {
	var vendor domain.Vendor
	err := row.Scan(&vendor.ID, &vendor.Name, &vendor.GSTNumber, &vendor.Category, &vendor.ContactNumber, &vendor.Email, &vendor.Country, &vendor.Status, &vendor.Notes, &vendor.CreatedAt, &vendor.UpdatedAt)
	if err != nil {
		return domain.Vendor{}, fmt.Errorf("scan vendor: %w", err)
	}
	return vendor, nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanVendors(rows *sql.Rows) ([]domain.Vendor, error) {
	vendors := make([]domain.Vendor, 0)
	for rows.Next() {
		vendor, err := scanVendor(rows)
		if err != nil {
			return nil, err
		}
		vendors = append(vendors, vendor)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return vendors, nil
}
