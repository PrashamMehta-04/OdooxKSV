package config

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	Environment string
	HTTPAddr    string
	DatabaseURL string
	AuthSecret  string
}

func Load() Config {
	_ = loadDotEnv(".env")

	return Config{
		Environment: getEnv("APP_ENV", "development"),
		HTTPAddr:    getEnv("HTTP_ADDR", ":8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://vendorbridge:vendorbridge@localhost:5432/vendorbridge?sslmode=disable"),
		AuthSecret:  getEnv("AUTH_SECRET", "vendorbridge-dev-secret-change-me"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func loadDotEnv(path string) error {
	file, err := os.Open(path)
	if err != nil {
		return nil
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)
		if key != "" {
			if _, exists := os.LookupEnv(key); !exists {
				_ = os.Setenv(key, value)
			}
		}
	}
	return scanner.Err()
}
