package store

import (
	"context"
	"database/sql"

	"vendorbridge/internal/domain"
)

func (s *Store) ListNotifications(ctx context.Context, userID string) ([]domain.Notification, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, user_id::text, title, message, COALESCE(link, ''), is_read, created_at
		FROM notifications
		WHERE user_id = $1::uuid
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.Notification, 0)
	for rows.Next() {
		var n domain.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Message, &n.Link, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, n)
	}
	return items, rows.Err()
}

func (s *Store) MarkNotificationRead(ctx context.Context, id, userID string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE notifications SET is_read = TRUE 
		WHERE id = $1::uuid AND user_id = $2::uuid
	`, id, userID)
	return err
}

func (s *Store) MarkAllNotificationsRead(ctx context.Context, userID string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE notifications SET is_read = TRUE 
		WHERE user_id = $1::uuid
	`, userID)
	return err
}

func (s *Store) NotifyUserTx(ctx context.Context, tx *sql.Tx, userID, title, message, link string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO notifications (user_id, title, message, link)
		VALUES ($1::uuid, $2, $3, NULLIF($4, ''))
	`, userID, title, message, link)
	return err
}

func (s *Store) NotifyRoleTx(ctx context.Context, tx *sql.Tx, role, title, message, link string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO notifications (user_id, title, message, link)
		SELECT id, $2, $3, NULLIF($4, '') FROM users WHERE role = $1
	`, role, title, message, link)
	return err
}

func (s *Store) NotifyVendorTx(ctx context.Context, tx *sql.Tx, vendorID, title, message, link string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO notifications (user_id, title, message, link)
		SELECT u.id, $2, $3, NULLIF($4, '')
		FROM users u
		INNER JOIN vendors v ON v.email = u.email
		WHERE v.id = $1::uuid
	`, vendorID, title, message, link)
	return err
}
