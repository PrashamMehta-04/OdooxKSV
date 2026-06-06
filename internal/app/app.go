package app

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"vendorbridge/internal/config"
	"vendorbridge/internal/db"
	"vendorbridge/internal/migrate"
	"vendorbridge/internal/server"
	"vendorbridge/internal/store"
)

// Run wires configuration, Postgres, and the HTTP server together.
func Run(ctx context.Context, logger *slog.Logger) error {
	cfg := config.Load()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer database.Close()

	if err := migrate.Apply(ctx, database, "migrations"); err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}

	appStore := store.New(database)
	srv := server.New(logger, appStore, cfg.AuthSecret)

	httpServer := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           srv.Router(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("http server starting", "addr", cfg.HTTPAddr)
		errCh <- httpServer.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		logger.Info("shutting down http server")
		return httpServer.Shutdown(shutdownCtx)
	case err := <-errCh:
		if err == nil || err == http.ErrServerClosed {
			return nil
		}
		return err
	}
}
