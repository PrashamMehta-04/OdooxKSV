package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"vendorbridge/internal/auth"
)

type Store struct {
	db *sql.DB
}

func New(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) DB() *sql.DB {
	return s.db
}

func (s *Store) withTx(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Store) insertActivity(ctx context.Context, tx execer, actorID, entityType, entityID, action string, metadata map[string]any) error {
	if metadata == nil {
		metadata = map[string]any{}
	}
	payload, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, metadata)
		VALUES (NULLIF($1, '')::uuid, $2, NULLIF($3, '')::uuid, $4, $5::jsonb)
	`, nullText(actorID), entityType, nullText(entityID), action, payload)
	return err
}

type execer interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func nullText(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func parseTimePtr(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	t := value.Time.UTC()
	return &t
}

func assignTimePtr(target **time.Time, value sql.NullTime) {
	*target = parseTimePtr(value)
}

func randomNumber(prefix string) (string, error) {
	token, err := auth.RandomToken(6)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s-%s", prefix, token), nil
}
