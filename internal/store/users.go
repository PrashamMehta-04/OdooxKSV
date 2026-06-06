package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"vendorbridge/internal/domain"
)

type CreateUserParams struct {
	FullName       string
	Email          string
	PasswordHash   string
	Role           string
	Country        string
	PhoneNumber    string
	PhotoURL       string
	AdditionalInfo string
}

type UpdateUserParams struct {
	FullName    *string `json:"full_name"`
	Role        *string `json:"role"`
	Country     *string `json:"country"`
	PhoneNumber *string `json:"phone_number"`
}

func (s *Store) CreateUser(ctx context.Context, params CreateUserParams) (domain.User, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.User{}, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(ctx, `
		INSERT INTO users (full_name, email, password_hash, role, country, phone_number, photo_url, additional_info)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''))
		RETURNING id::text, full_name, email, role, COALESCE(country, ''), COALESCE(phone_number, ''), COALESCE(photo_url, ''), COALESCE(additional_info, ''), created_at, updated_at
	`, params.FullName, params.Email, params.PasswordHash, params.Role, params.Country, params.PhoneNumber, params.PhotoURL, params.AdditionalInfo)

	user, err := scanUser(row)
	if err != nil {
		return domain.User{}, err
	}

	if strings.ToLower(user.Role) == "vendor" {
		// Ensure vendor record exists
		// We use the USER ID as the VENDOR ID to ensure consistency and fix FK issues
		_, err = tx.ExecContext(ctx, `
			INSERT INTO vendors (id, name, email, country, contact_number, status)
			VALUES ($1::uuid, $2, $3, NULLIF($4, ''), NULLIF($5, ''), 'pending')
			ON CONFLICT (email) DO UPDATE SET 
				name = EXCLUDED.name,
				country = COALESCE(NULLIF(EXCLUDED.country, ''), vendors.country),
				contact_number = COALESCE(NULLIF(EXCLUDED.contact_number, ''), vendors.contact_number)
		`, user.ID, user.FullName, user.Email, user.Country, user.PhoneNumber)
		if err != nil {
			return domain.User{}, fmt.Errorf("create shadow vendor: %w", err)
		}
	}

	return user, tx.Commit()
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (domain.User, string, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id::text, full_name, email, password_hash, role, COALESCE(country, ''), COALESCE(phone_number, ''), COALESCE(photo_url, ''), COALESCE(additional_info, ''), created_at, updated_at
		FROM users
		WHERE email = $1
	`, email)

	var user domain.User
	var passwordHash string
	if err := row.Scan(&user.ID, &user.FullName, &user.Email, &passwordHash, &user.Role, &user.Country, &user.PhoneNumber, &user.PhotoURL, &user.AdditionalInfo, &user.CreatedAt, &user.UpdatedAt); err != nil {
		return domain.User{}, "", err
	}
	return user, passwordHash, nil
}

func (s *Store) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id::text, full_name, email, role, COALESCE(country, ''), COALESCE(phone_number, ''), COALESCE(photo_url, ''), COALESCE(additional_info, ''), created_at, updated_at
		FROM users
		WHERE id = $1::uuid
	`, id)
	return scanUser(row)
}

func (s *Store) ListUsers(ctx context.Context) ([]domain.User, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, full_name, email, role, COALESCE(country, ''), COALESCE(phone_number, ''), COALESCE(photo_url, ''), COALESCE(additional_info, ''), created_at, updated_at
		FROM users
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]domain.User, 0)
	for rows.Next() {
		var user domain.User
		if err := rows.Scan(&user.ID, &user.FullName, &user.Email, &user.Role, &user.Country, &user.PhoneNumber, &user.PhotoURL, &user.AdditionalInfo, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) UpdateUser(ctx context.Context, id string, params UpdateUserParams) (domain.User, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.User{}, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(ctx, `
		UPDATE users
		SET full_name = COALESCE($2, full_name),
		    role = COALESCE($3, role),
		    country = COALESCE($4, country),
		    phone_number = COALESCE($5, phone_number),
		    updated_at = NOW()
		WHERE id = $1::uuid
		RETURNING id::text, full_name, email, role, COALESCE(country, ''), COALESCE(phone_number, ''), COALESCE(photo_url, ''), COALESCE(additional_info, ''), created_at, updated_at
	`, id, params.FullName, params.Role, params.Country, params.PhoneNumber)

	var user domain.User
	if err := row.Scan(&user.ID, &user.FullName, &user.Email, &user.Role, &user.Country, &user.PhoneNumber, &user.PhotoURL, &user.AdditionalInfo, &user.CreatedAt, &user.UpdatedAt); err != nil {
		return domain.User{}, err
	}

	if strings.ToLower(user.Role) == "vendor" {
		// Ensure vendor record exists
		_, err = tx.ExecContext(ctx, `
			INSERT INTO vendors (name, email, country, contact_number, status)
			VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), 'pending')
			ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
		`, user.FullName, user.Email, user.Country, user.PhoneNumber)
		if err != nil {
			return domain.User{}, fmt.Errorf("create/update shadow vendor: %w", err)
		}
	}

	return user, tx.Commit()
}

func (s *Store) DeleteUser(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1::uuid", id)
	return err
}

func (s *Store) UpdatePassword(ctx context.Context, email, passwordHash string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE users SET password_hash = $2, updated_at = NOW()
		WHERE email = $1
	`, email, passwordHash)
	return err
}

func (s *Store) CreateOTP(ctx context.Context, email, code string, expiresAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO otps (email, code, expires_at)
		VALUES ($1, $2, $3)
	`, email, code, expiresAt)
	return err
}

func (s *Store) VerifyOTP(ctx context.Context, email, code string) (bool, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
		SELECT id FROM otps
		WHERE email = $1 AND code = $2 AND expires_at > NOW()
		LIMIT 1
	`, email, code).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	// Delete OTP after successful verification to make it single-use
	_, _ = s.db.ExecContext(ctx, "DELETE FROM otps WHERE id = $1::uuid", id)

	return true, nil
}

func scanUser(row *sql.Row) (domain.User, error) {
	var user domain.User
	err := row.Scan(&user.ID, &user.FullName, &user.Email, &user.Role, &user.Country, &user.PhoneNumber, &user.PhotoURL, &user.AdditionalInfo, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return domain.User{}, fmt.Errorf("scan user: %w", err)
	}
	return user, nil
}
