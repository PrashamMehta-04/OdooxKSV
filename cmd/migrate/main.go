package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"vendorbridge/internal/config"
	"vendorbridge/internal/db"
	"vendorbridge/internal/migrate"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("open database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	if err := migrate.Apply(ctx, database, "migrations"); err != nil {
		logger.Error("apply migrations", "error", err)
		os.Exit(1)
	}

	fmt.Println("migrations applied")
}
