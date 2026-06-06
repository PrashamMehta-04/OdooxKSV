package store

import (
	"context"
	"database/sql"
	"fmt"

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

func (s *Store) CreateUser(ctx context.Context, params CreateUserParams) (domain.User, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO users (full_name, email, password_hash, role, country, phone_number, photo_url, additional_info)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''))
		RETURNING id::text, full_name, email, role, COALESCE(country, ''), COALESCE(phone_number, ''), COALESCE(photo_url, ''), COALESCE(additional_info, ''), created_at, updated_at
	`, params.FullName, params.Email, params.PasswordHash, params.Role, params.Country, params.PhoneNumber, params.PhotoURL, params.AdditionalInfo)

	return scanUser(row)
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

func scanUser(row *sql.Row) (domain.User, error) {
	var user domain.User
	err := row.Scan(&user.ID, &user.FullName, &user.Email, &user.Role, &user.Country, &user.PhoneNumber, &user.PhotoURL, &user.AdditionalInfo, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return domain.User{}, fmt.Errorf("scan user: %w", err)
	}
	return user, nil
}
