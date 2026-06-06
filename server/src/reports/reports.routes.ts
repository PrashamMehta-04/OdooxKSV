import { Router } from "express";
import { requireAuth, requireRoles } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";

export const reportsRouter = Router();

reportsRouter.get("/", requireAuth, requireRoles(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    // 1. Spending Trend (Last 6 Months based on Invoices that are SENT or PAID)
    // For SQLite/Postgres compatibility we use TO_CHAR in Postgres for grouping
    const { rows: spendRows } = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month,
        SUM(total) as amount
      FROM invoices
      WHERE status IN ('SENT', 'PAID')
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

    // 2. Vendor Performance (Top 5 Vendors by PO count)
    const { rows: vendorRows } = await db.query(`
      SELECT 
        v.company_name as name,
        COUNT(po.id) as "orderCount",
        SUM(po.total) as "totalSpend"
      FROM vendors v
      JOIN purchase_orders po ON po.vendor_id = v.id
      GROUP BY v.id, v.company_name
      ORDER BY "totalSpend" DESC NULLS LAST
      LIMIT 5
    `);

    // 3. RFQ Turnaround Time (Average time from DRAFT to CLOSED)
    // Postgres specific: EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 as days
    const { rows: turnaroundRows } = await db.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as "avgDays"
      FROM rfqs
      WHERE status = 'CLOSED'
    `);

    // 4. Status Distribution of RFQs
    const { rows: rfqStatusRows } = await db.query(`
      SELECT status, COUNT(*) as count
      FROM rfqs
      GROUP BY status
    `);

    res.json({
      spending: spendRows.map(r => ({ month: r.month, amount: Number(r.amount) || 0 })),
      vendors: vendorRows.map(r => ({ 
        name: r.name, 
        orderCount: Number(r.orderCount), 
        totalSpend: Number(r.totalSpend) || 0 
      })),
      avgTurnaroundDays: Number(turnaroundRows[0]?.avgDays) || 0,
      rfqDistribution: rfqStatusRows.map(r => ({ name: r.status, value: Number(r.count) }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate reports data" });
  }
});
