# OdooxKSV

## VendorBridge Backend Scaffold

This repository now includes the first backend structure for the VendorBridge procurement platform.

The backend now includes:

- JWT-style HMAC auth for users and roles
- Vendor CRUD
- RFQ creation with line items, vendor assignment, and attachments
- Quotation submission and comparison support
- Multi-step approval workflow
- Automatic PO and invoice creation after final approval
- Dashboard metrics and spend trend reporting
- Immutable activity logs
- Automatic SQL migration application on startup
- `chi` router with request logging, request IDs, and recovery middleware

### Stack

- Go 1.26.1
- Postgres 17
- Docker and Docker Compose

### Layout

- `cmd/api`: application entrypoint
- `internal/app`: startup wiring
- `internal/config`: environment configuration
- `internal/db`: Postgres connection bootstrap
- `internal/server`: HTTP router and basic health endpoints
- `internal/modules`: domain boundaries for auth, vendors, RFQs, quotations, approvals, purchase orders, invoices, and activity
- `internal/migrate`: automatic SQL migration runner
- `migrations`: schema files

### Run

```bash
docker compose up --build
```

The app applies any new SQL files in `migrations/` on startup.
The repository includes a local [`.env`](/workspaces/OdooxKSV/.env) for host execution and [`.env.example`](/workspaces/OdooxKSV/.env.example) as the template.

If you want to run the API directly on the host, make sure Postgres is available on `localhost:5432` with the credentials in `.env`.

### Make Targets

```bash
make run
make test
make build
make migrate
make compose-up
make compose-down
```

`make run` will start the Postgres container first, wait for it to become ready, and then launch the API on the host.

To build the binary outside Docker, use:

```bash
go build ./cmd/api
```

### Endpoints

- `GET /healthz`
- `GET /readyz`
- `GET /`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/dashboard`
- `GET|POST /api/v1/vendors`
- `GET|PATCH|DELETE /api/v1/vendors/{id}`
- `GET|POST /api/v1/rfqs`
- `POST /api/v1/rfqs/{id}/line-items`
- `POST /api/v1/rfqs/{id}/vendors`
- `POST /api/v1/rfqs/{id}/attachments`
- `GET|POST /api/v1/rfqs/{id}/quotations`
- `GET /api/v1/quotations`
- `GET /api/v1/quotations/{id}`
- `POST /api/v1/quotations/{id}/select`
- `GET /api/v1/approvals`
- `GET /api/v1/approvals/{id}`
- `POST /api/v1/approvals/{id}/decide`
- `GET /api/v1/purchase-orders`
- `GET /api/v1/purchase-orders/{id}`
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/{id}`
- `POST /api/v1/invoices/{id}/send`
- `GET /api/v1/activity`
- `GET /api/v1/reports/spend-trend`
