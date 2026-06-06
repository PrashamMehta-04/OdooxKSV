package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"vendorbridge/internal/app"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	if err := app.Run(ctx, logger); err != nil {
		logger.Error("application stopped with error", "error", err)
		os.Exit(1)
	}
}
