import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";
import type { Role } from "../domain/types.js";

export const dashboardRouter = Router();

interface CountRow {
  count: string;
}

interface PurchaseOrderRow {
  id: string;
  po_number: string;
  status: string;
  total: string;
  issued_at: Date;
  vendor_name: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  total: string;
  due_date: Date;
  created_at: Date;
  po_number: string;
}

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  read_at: Date | null;
  created_at: Date;
}

interface ActivityRow {
  id: string;
  action: string;
  message: string;
  entity_type: string;
  created_at: Date;
  actor_name: string | null;
}

interface SpendRow {
  month: string;
  spend: string;
}

function numberFromCount(row: CountRow | undefined) {
  return Number(row?.count ?? 0);
}

async function count(sql: string, values: unknown[] = []) {
  const result = await db.query<CountRow>(sql, values);
  return numberFromCount(result.rows[0]);
}

function purchaseOrderScope(role: Role, userId: string) {
  if (role === "PROCUREMENT_OFFICER") {
    return {
      where: "po.created_by_id = $1",
      values: [userId]
    };
  }

  if (role === "VENDOR") {
    return {
      where: "q.submitted_by_id = $1",
      values: [userId]
    };
  }

  return {
    where: "true",
    values: []
  };
}

function invoiceScope(role: Role, userId: string) {
  if (role === "PROCUREMENT_OFFICER") {
    return {
      where: "po.created_by_id = $1",
      values: [userId]
    };
  }

  if (role === "VENDOR") {
    return {
      where: "q.submitted_by_id = $1",
      values: [userId]
    };
  }

  return {
    where: "true",
    values: []
  };
}

async function getSummary(role: Role, userId: string) {
  const pendingApprovals =
    role === "MANAGER"
      ? await count("SELECT count(*) FROM approval_requests WHERE status = 'PENDING' AND approver_id = $1", [
          userId
        ])
      : role === "PROCUREMENT_OFFICER"
        ? await count(
            "SELECT count(*) FROM approval_requests WHERE status = 'PENDING' AND requested_by_id = $1",
            [userId]
          )
        : role === "VENDOR"
          ? await count("SELECT count(*) FROM quotations WHERE status = 'SELECTED' AND submitted_by_id = $1", [
              userId
            ])
          : await count("SELECT count(*) FROM approval_requests WHERE status = 'PENDING'");

  const activeRfqs =
    role === "PROCUREMENT_OFFICER"
      ? await count(
          `SELECT count(*) FROM rfqs
           WHERE created_by_id = $1
             AND status IN ('SENT', 'QUOTING', 'UNDER_REVIEW', 'APPROVAL_PENDING')`,
          [userId]
        )
      : role === "VENDOR"
        ? await count(
            `SELECT count(DISTINCT r.id)
             FROM rfqs r
             JOIN quotations q ON q.rfq_id = r.id
             WHERE q.submitted_by_id = $1
               AND r.status IN ('SENT', 'QUOTING', 'UNDER_REVIEW', 'APPROVAL_PENDING')`,
            [userId]
          )
        : await count(
            "SELECT count(*) FROM rfqs WHERE status IN ('SENT', 'QUOTING', 'UNDER_REVIEW', 'APPROVAL_PENDING')"
          );

  const purchaseOrderScopeValue = purchaseOrderScope(role, userId);
  const purchaseOrders = await count(
    `SELECT count(*)
     FROM purchase_orders po
     JOIN quotations q ON q.id = po.quotation_id
     WHERE ${purchaseOrderScopeValue.where}`,
    purchaseOrderScopeValue.values
  );

  const invoiceScopeValue = invoiceScope(role, userId);
  const invoices = await count(
    `SELECT count(*)
     FROM invoices i
     JOIN purchase_orders po ON po.id = i.purchase_order_id
     JOIN quotations q ON q.id = po.quotation_id
     WHERE ${invoiceScopeValue.where}`,
    invoiceScopeValue.values
  );

  return [
    {
      label: role === "VENDOR" ? "Selected quotes" : "Pending approvals",
      value: pendingApprovals,
      caption: role === "MANAGER" ? "Waiting for your decision" : "Needs workflow attention"
    },
    {
      label: role === "VENDOR" ? "Active RFQ responses" : "Active RFQs",
      value: activeRfqs,
      caption: "Open procurement work"
    },
    {
      label: "Purchase orders",
      value: purchaseOrders,
      caption: "Issued procurement documents"
    },
    {
      label: "Invoices",
      value: invoices,
      caption: "Generated invoice records"
    }
  ];
}

async function getRecentPurchaseOrders(role: Role, userId: string) {
  const scope = purchaseOrderScope(role, userId);
  const result = await db.query<PurchaseOrderRow>(
    `SELECT po.id, po.po_number, po.status, po.total, po.issued_at, v.company_name AS vendor_name
     FROM purchase_orders po
     JOIN vendors v ON v.id = po.vendor_id
     JOIN quotations q ON q.id = po.quotation_id
     WHERE ${scope.where}
     ORDER BY po.issued_at DESC
     LIMIT 5`,
    scope.values
  );

  return result.rows.map((row) => ({
    id: row.id,
    number: row.po_number,
    status: row.status,
    total: Number(row.total),
    date: row.issued_at.toISOString(),
    vendorName: row.vendor_name
  }));
}

async function getRecentInvoices(role: Role, userId: string) {
  const scope = invoiceScope(role, userId);
  const result = await db.query<InvoiceRow>(
    `SELECT i.id, i.invoice_number, i.status, i.total, i.due_date, i.created_at, po.po_number
     FROM invoices i
     JOIN purchase_orders po ON po.id = i.purchase_order_id
     JOIN quotations q ON q.id = po.quotation_id
     WHERE ${scope.where}
     ORDER BY i.created_at DESC
     LIMIT 5`,
    scope.values
  );

  return result.rows.map((row) => ({
    id: row.id,
    number: row.invoice_number,
    status: row.status,
    total: Number(row.total),
    dueDate: row.due_date.toISOString(),
    date: row.created_at.toISOString(),
    purchaseOrderNumber: row.po_number
  }));
}

async function getNotifications(userId: string) {
  const result = await db.query<NotificationRow>(
    `SELECT id, title, message, type, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: Boolean(row.read_at),
    date: row.created_at.toISOString()
  }));
}

async function getActivity(role: Role, userId: string) {
  const where =
    role === "PROCUREMENT_OFFICER"
      ? "WHERE al.actor_id = $1"
      : role === "VENDOR"
        ? "WHERE al.actor_id = $1"
        : "";
  const values = where ? [userId] : [];
  const result = await db.query<ActivityRow>(
    `SELECT al.id, al.action, al.message, al.entity_type, al.created_at, u.name AS actor_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT 5`,
    values
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    message: row.message,
    entityType: row.entity_type,
    actorName: row.actor_name,
    date: row.created_at.toISOString()
  }));
}

async function getMonthlySpend(role: Role, userId: string) {
  const scope = purchaseOrderScope(role, userId);
  const result = await db.query<SpendRow>(
    `SELECT to_char(date_trunc('month', po.issued_at), 'Mon') AS month, sum(po.total)::text AS spend
     FROM purchase_orders po
     JOIN quotations q ON q.id = po.quotation_id
     WHERE ${scope.where}
     GROUP BY date_trunc('month', po.issued_at)
     ORDER BY date_trunc('month', po.issued_at) ASC
     LIMIT 6`,
    scope.values
  );

  return result.rows.map((row) => ({
    month: row.month,
    spend: Number(row.spend)
  }));
}

dashboardRouter.get("/", requireAuth, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const [summary, purchaseOrders, invoices, notifications, activity, monthlySpend] = await Promise.all([
    getSummary(req.user.role, req.user.id),
    getRecentPurchaseOrders(req.user.role, req.user.id),
    getRecentInvoices(req.user.role, req.user.id),
    getNotifications(req.user.id),
    getActivity(req.user.role, req.user.id),
    getMonthlySpend(req.user.role, req.user.id)
  ]);

  res.json({
    summary,
    purchaseOrders,
    invoices,
    notifications,
    activity,
    monthlySpend
  });
});
