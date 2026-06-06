# VendorBridge — Procurement & Vendor Management ERP

A full-stack ERP platform for managing vendors, RFQs, quotations, approvals, purchase orders, and invoices.

## Tech Stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Frontend  | React 18 + TypeScript + Vite + Tailwind CSS             |
| Backend   | Node.js + Express + TypeScript                          |
| Database  | PostgreSQL 15 via Prisma ORM                            |
| Container | Docker + docker-compose                                 |
| Auth      | JWT + bcrypt                                            |
| PDF       | pdfkit                                                  |
| Email     | Nodemailer                                              |
| Charts    | Recharts                                                |

## Getting Started

### Option A — Docker (recommended, full stack)

```bash
docker-compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost           |
| Backend  | http://localhost:3001      |
| Postgres | localhost:5432             |

The backend container automatically runs migrations and seeds demo data on first start.

---

### Option B — Local Development

**1. Start PostgreSQL with Docker (DB only)**

```bash
docker-compose up db
```

**2. Start the Backend**

```bash
cd backend
cp .env.example .env        # then edit DATABASE_URL if needed
npm install
npm run migrate:dev         # creates schema via Prisma migrations
npm run db:seed             # populate with demo data
npm run dev                 # starts on http://localhost:3001
```

**3. Start the Frontend**

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

---

## Demo Credentials

| Role                 | Email                       | Password     |
|----------------------|-----------------------------|--------------|
| Admin                | admin@vendorbridge.com      | Admin@123    |
| Manager / Approver   | manager@vendorbridge.com    | Manager@123  |
| Procurement Officer  | officer@vendorbridge.com    | Officer@123  |
| Vendor               | rahul@techsupply.com        | Vendor@123   |

---

## Features

### Screens
1. **Login / Signup** — Role-based authentication with JWT
2. **Dashboard** — KPI cards, recent activity, monthly trend chart, quick actions
3. **Vendor Management** — Register vendors, track status, GST, categories, search & filter
4. **RFQ Creation** — Create RFQs with line items, assign vendors, send invitations
5. **Vendor Quotations** — Vendors submit pricing per RFQ item, manage draft/submit lifecycle
6. **Quotation Comparison** — Side-by-side comparison with lowest-price highlighting
7. **Approval Workflow** — Manager approves/rejects with remarks, timeline tracking
8. **Purchase Orders & Invoices** — Auto-generated PO/invoice numbers, PDF download, email send
9. **Activity Logs** — Full audit trail with entity filtering
10. **Reports & Analytics** — Vendor performance, spending by category, monthly trends

### User Roles
| Role                 | Capabilities                                                    |
|----------------------|-----------------------------------------------------------------|
| **Admin**            | Manage users, vendors, view all data and analytics              |
| **Procurement Officer** | Create RFQs, compare quotations, generate POs and invoices   |
| **Vendor**           | Submit quotations, track RFQ status, view purchase orders       |
| **Manager**          | Approve or reject procurement requests, monitor workflows       |

### Procurement Workflow
```
Officer creates RFQ → Vendors receive invitations → Vendors submit quotations
→ Officer compares quotations → Requests approval → Manager approves/rejects
→ Purchase Order generated → Invoice generated → Invoice printed/emailed
```

---

## Project Structure

```
OdooxKSV/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/          (auth, vendors, rfqs, quotations, approvals,
│   │   │                     purchaseOrders, invoices, activityLogs,
│   │   │                     notifications, dashboard, reports)
│   │   ├── middleware/      (auth.ts — JWT + role guards)
│   │   ├── lib/             (prisma, logger, mailer)
│   │   └── types/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── .env
└── frontend/
    └── src/
        ├── api/             (axios instance with interceptors)
        ├── contexts/        (AuthContext)
        ├── components/      (Layout, UI components)
        └── pages/           (Login, Signup, Dashboard, Vendors, RFQs,
                              Quotations, Approvals, PurchaseOrders,
                              Invoices, ActivityLogs, Reports)
```

## Email Configuration (optional)

To enable invoice emailing and password-reset OTP emails, add your SMTP credentials to `backend/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
```
