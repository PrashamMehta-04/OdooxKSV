APP_NAME := vendorbridge
GOCACHE ?= /tmp/vendorbridge-gocache
-include .env

.PHONY: run test build fmt migrate compose-up compose-down db-up db-down frontend-install frontend-run frontend-build frontend-check

run: db-up
	GOCACHE=$(GOCACHE) go run ./cmd/api

test:
	GOCACHE=$(GOCACHE) go test ./...

build:
	GOCACHE=$(GOCACHE) go build -o bin/$(APP_NAME) ./cmd/api

fmt:
	gofmt -w $$(find cmd internal -name '*.go' | sort)

migrate: db-up
	GOCACHE=$(GOCACHE) go run ./cmd/migrate

compose-up:
	docker compose up --build

compose-down:
	docker compose down

db-up:
	docker compose up -d db
	sh -c 'until docker compose exec -T db pg_isready -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" >/dev/null 2>&1; do sleep 1; done'

db-down:
	docker compose stop db

frontend-install:
	cd frontend && npm install

frontend-run:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

frontend-check:
	cd frontend && npm run check
