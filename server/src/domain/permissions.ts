import type { Role } from "./types.js";

export const rolePermissions: Record<Role, string[]> = {
  ADMIN: [
    "users:manage",
    "vendors:manage",
    "rfqs:read",
    "quotations:read",
    "approvals:read",
    "purchase-orders:read",
    "invoices:read",
    "activity:read",
    "reports:read"
  ],
  PROCUREMENT_OFFICER: [
    "vendors:read",
    "rfqs:manage",
    "quotations:compare",
    "approvals:create",
    "purchase-orders:manage",
    "invoices:manage",
    "activity:read"
  ],
  VENDOR: ["rfqs:assigned-read", "quotations:submit", "purchase-orders:assigned-read"],
  MANAGER: ["rfqs:read", "quotations:read", "approvals:decide", "activity:read", "reports:read"]
};
