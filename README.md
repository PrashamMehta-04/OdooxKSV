# VendorBridge ERP

**Procurement & Vendor Management ERP**

VendorBridge is a comprehensive, professional-grade ERP platform designed to simplify and digitize procurement operations. Built with a clean architecture and an Odoo-inspired aesthetic, it manages the entire procurement lifecycle—from vendor onboarding and RFQ creation to quotation comparison, multi-level approvals, and automated financial document generation.

## 🚀 Key Features

### 🏢 Vendor Management
- **Centralized Directory:** Track suppliers with detailed profiles including GST, category, and contact info.
- **Admin Controls:** Full CRUD (Create, Read, Update, Delete) capabilities for administrators.
- **User-Vendor Sync:** Automatic synchronization between system user accounts and business vendor records.

### 📝 Procurement Workflow (RFQ to PO)
- **RFQ Engine:** Create detailed Requests for Quotation with line items and vendor assignments.
- **Vendor Portal:** Dedicated interface for vendors to track assignments and submit detailed quotations.
- **Side-by-Side Comparison:** Compare vendor bids based on price, delivery timeline, and terms with visual highlights for the best offers.
- **Winner Selection:** One-click transition from comparison to the approval workflow.

### 🛡️ Financial Oversight & Approvals
- **Multi-Level Workflow:** Structured L1 (Procurement Head) and L2 (Finance Manager) approval stages.
- **Decision Panel:** Managers can approve or reject with mandatory audit remarks.
- **Automation:** Automatic generation of **Purchase Orders** and **Invoices** upon final authorization.

### 📊 Intelligence & Reporting
- **Interactive Analytics:** Real-time spending trends using **Chart.js** visualizations.
- **Spending Summary:** Breakdown of costs by category and department.
- **Performance Leaderboard:** Data-driven evaluation of vendor reliability and contract win rates.
- **Exportable Data:** One-click CSV export for vendor performance reports.

### 🔔 Audit & Notifications
- **Immutable Audit Trail:** Complete history of every workflow event (Activity Log) with server-side pagination.
- **Real-Time Alerts:** Odoo-themed notification bell with a **sliding drawer UI** for instant updates on RFQ assignments and approvals.

### 🎨 Modern UI/UX
- **Odoo Theme:** Consistent White & Purple aesthetic (`#714B67`) with professional typography (Lato).
- **Responsive Design:** Fully optimized for Mobile, Tablet, and Desktop.
- **Actionable Interface:** Standardized Data Card grids and modernized, sectioned forms.

---

## 🛠️ Tech Stack

- **Backend:** Go (Golang) with `chi` router
- **Frontend:** React (TypeScript) + Vite
- **Database:** PostgreSQL 17
- **Infrastrucure:** Docker & Docker Compose
- **Visuals:** Chart.js, Custom SVG Branding

---

## 🏗️ Project Structure

- `cmd/api`: Application entrypoint.
- `internal/server`: HTTP router, middleware (RBAC), and API handlers.
- `internal/store`: Data access layer (PostgreSQL) with complex procurement logic.
- `internal/domain`: Shared business models and types.
- `frontend/src/pages`: Modular React pages for every stage of the ERP.
- `migrations`: Automatic SQL schema migrations.

---

## 🚦 Getting Started

### Prerequisites
- Docker & Docker Compose installed.

### Run with Docker (Recommended)
```bash
docker compose up --build
```
The application will be available at:
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8080`

### Local Development
1. **Backend:**
   ```bash
   make run
   ```
2. **Frontend:**
   ```bash
   make frontend-install
   make frontend-run
   ```

---

## 📑 API Endpoints

### Authentication & Users
- `POST /api/v1/auth/register` - User onboarding
- `POST /api/v1/auth/login` - Session start
- `POST /api/v1/auth/forgot-password` - Request OTP
- `POST /api/v1/auth/reset-password` - Verify & Update
- `GET /api/v1/users` - Directory (Admin Only)

### Procurement Core
- `GET /api/v1/vendors/me` - Own profile (Vendor Only)
- `GET/POST /api/v1/rfqs` - Request library & Creation
- `POST /api/v1/quotations/{id}/select` - Pick winner
- `POST /api/v1/approvals/{id}/decide` - L1/L2 Review

### Analytics & Audit
- `GET /api/v1/dashboard` - KPI summary
- `GET /api/v1/reports/stats` - Advanced analytics
- `GET /api/v1/activity` - Audit trail
- `GET /api/v1/notifications` - Alert stream

---

*VendorBridge ERP - Empowering modern procurement through structured workflows and actionable data.*
