# VendorBridge

Procurement & Vendor Management ERP built with React, Express, Node.js, and PostgreSQL.

## Tech Stack

- PostgreSQL in Docker
- Express and Node.js
- React with Vite
- TypeScript
- Tailwind CSS
- TanStack Query, TanStack Table, React Hook Form, Zod, Recharts, Radix UI, Lucide icons

## Getting Started

Install dependencies:

```bash
npm install
```

Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Run both apps:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:5000/api/health`

Start Postgres with Docker:

```bash
docker compose up -d postgres
```

Prepare the database:

```bash
npm run db:setup
npm run db:seed
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run format
npm run db:setup
npm run db:seed
```
