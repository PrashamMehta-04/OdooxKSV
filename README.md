# VendorBridge — Procurement & Vendor Management ERP

[![React](https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Container-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

VendorBridge is a centralized, role-based ERP platform designed to simplify and digitize procurement operations for organizations. It automates workflows from RFQ creation to quotation comparison, multi-tier approvals, purchase order fulfillment, and invoice generation.

---

## 🚀 Key Features

### 1. Role-Based Portals & Dashboards
*   **KPI Tracking**: Real-time analytics showing pending approvals, active RFQs, total spend, and recent procurement activities.
*   **Role Access**: Tailored workflows for **Procurement Officers**, **Managers/Approvers**, **Vendors**, and **System Administrators**.
*   **Trends Visualizer**: Monthly spending trends and order volume graphs built with Recharts.

### 2. Vendor Management
*   **Centralized Records**: Organize vendor contact details, categories, GST, and ratings.
*   **Advanced Filtering**: Search, filter, and track status (active, inactive, blacklisted) instantly.

### 3. Digitized RFQ Workflow
*   **Line-Item Management**: Create RFQs with detailed item lists, quantities, and units.
*   **Vendor Invitations**: Invite multiple vendors to bid. Invites trigger real-time notifications for vendors.
*   **Supporting Attachments**: Link engineering diagrams, requirements documents, or specification spreadsheets directly.

### 4. Smart Quotation Submission & Side-by-Side Comparison
*   **Draft & Submit**: Vendors can save drafts, edit, and submit delivery timelines, unit prices, and notes.
*   **Side-by-Side Compare**: Compare submissions in a grid with:
    *   Automatic **lowest-price highlighting**.
    *   Vendor performance ratings.
    *   Sorting by Price (low/high) or Rating.
    *   Filtering by category or minimum rating.

### 5. Multi-Tier Approval Workflow
*   **Audit-Ready Approvals**: Procurement officers request approvals, and managers approve or reject requests with audit remarks.
*   **Automatic PO & Invoice Routing**: Approved quotations generate Purchase Orders and Invoices automatically with GST tax (18%) and total calculations.
*   **Export & Delivery**: Print invoices or download them as system-generated PDFs. Email invoices directly to vendors using Nodemailer.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Express-Validator |
| **Database** | PostgreSQL 15, Prisma ORM |
| **Security / Auth** | JWT (JSON Web Tokens), bcryptjs password hashing |
| **Integrations** | PDFKit (PDF generation), Nodemailer (SMTP email delivery) |
| **Charts** | Recharts (Data visualization) |

---

## 📦 Getting Started

### Option A — Quick Start with Docker (Recommended)

Run the entire stack with a single command. The backend automatically runs database migrations and seeds the demo credentials.

```bash
docker-compose up --build
```

#### Running Services

*   **Frontend Client**: [http://localhost](http://localhost) (port 80)
*   **Backend Server**: [http://localhost:3001](http://localhost:3001)
*   **PostgreSQL Database**: `localhost:5432`

---

### Option B — Local Development Setup

#### 1. Spin up PostgreSQL Database Only
```bash
docker-compose up db
```

#### 2. Set Up the Backend
1. Copy the template environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run migrations and seed the database:
   ```bash
   npm run migrate:dev
   npm run db:seed
   ```
4. Start the backend developer server:
   ```bash
   npm run dev
   ```
   *Server will run at [http://localhost:3001](http://localhost:3001)*

#### 3. Set Up the Frontend
1. Open a new terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Vite server will run at [http://localhost:5173](http://localhost:5173)*

---

## 🔐 Demo Credentials

Use these pre-seeded users to test various role-based workflows:

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@vendorbridge.com` | `Admin@123` | Manage users, vendors, and view global analytics. |
| **Manager / Approver** | `manager@vendorbridge.com` | `Manager@123` | Approve/reject procurement requests with remarks. |
| **Procurement Officer** | `officer@vendorbridge.com` | `Officer@123` | Create RFQs, compare quotes, generate POs and Invoices. |
| **Vendor** | `rahul@techsupply.com` | `Vendor@123` | Submit and edit quotes, view assigned POs. |

---

## ⚙️ SMTP Email Configuration (Optional)

To enable email delivery for password resets (OTP) and invoice sharing, add your SMTP server credentials to the `backend/.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 📂 Project Structure

```
OdooxKSV/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Server entrypoint
│   │   ├── routes/           # REST endpoints (auth, vendors, rfqs, quotations, etc.)
│   │   ├── middleware/       # Auth guards (JWT verification & role validations)
│   │   ├── lib/              # Client instances (prisma, mailer, logger)
│   │   └── types/
│   ├── prisma/
│   │   ├── schema.prisma     # Prisma schema defining entities and relations
│   │   └── seed.ts           # Demo database seed script
│   └── .env
└── frontend/
    └── src/
        ├── api/              # Axios instance with interceptors
        ├── contexts/         # React Auth Context provider
        ├── components/       # Layouts and reusable UI elements (Button, Input, Card)
        └── pages/            # View pages (Login, Dashboard, RFQs, Invoices, etc.)
```
