import { Router } from "express";
import { requireAuth, requireRoles } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";
import { z } from "zod";

export const posRouter = Router();

const createPoSchema = z.object({
  rfqId: z.string().uuid(),
  taxRate: z.number().min(0).max(100)
});

posRouter.get("/", requireAuth, async (req, res) => {
  try {
    const { user } = req;
    
    let query = `
      SELECT p.id, p.po_number as "poNumber", p.status, p.total, p.issued_at as "issuedAt",
             r.title as "rfqTitle", v.company_name as "vendorName"
      FROM purchase_orders p
      JOIN rfqs r ON p.rfq_id = r.id
      JOIN vendors v ON p.vendor_id = v.id
    `;
    
    const params: any[] = [];

    if (user!.role === "VENDOR") {
      query += ` WHERE v.email = $1 `;
      params.push(user!.email);
    }

    query += ` ORDER BY p.issued_at DESC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch purchase orders" });
  }
});

posRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.po_number as "poNumber", p.status, p.subtotal, p.tax_rate as "taxRate", p.tax_amount as "taxAmount", p.total, p.issued_at as "issuedAt",
              r.title as "rfqTitle", r.description as "rfqDescription", r.quantity, r.unit,
              v.company_name as "vendorName", v.email as "vendorEmail", v.address as "vendorAddress",
              q.unit_price as "unitPrice"
       FROM purchase_orders p
       JOIN rfqs r ON p.rfq_id = r.id
       JOIN vendors v ON p.vendor_id = v.id
       JOIN quotations q ON p.quotation_id = q.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Purchase order not found" });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch PO details" });
  }
});

posRouter.post("/", requireAuth, requireRoles(["PROCUREMENT_OFFICER", "ADMIN"]), async (req, res) => {
  const client = await db.connect();
  try {
    const data = createPoSchema.parse(req.body);
    const { user } = req;

    await client.query("BEGIN");

    // 1. Verify RFQ is APPROVED and has no existing PO
    const { rows: rfqRows } = await client.query(
      `SELECT r.id, r.status, a.id as "approvalId", a.quotation_id as "quotationId", q.vendor_id as "vendorId", q.total_price as "subtotal"
       FROM rfqs r
       JOIN approval_requests a ON r.id = a.rfq_id
       JOIN quotations q ON a.quotation_id = q.id
       WHERE r.id = $1 AND a.status = 'APPROVED'`,
      [data.rfqId]
    );

    if (rfqRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "Invalid RFQ or RFQ is not approved." });
      return;
    }

    const rfqInfo = rfqRows[0];

    // Check if PO already exists for this RFQ
    const { rows: existingPo } = await client.query(
      `SELECT id FROM purchase_orders WHERE rfq_id = $1`,
      [data.rfqId]
    );

    if (existingPo.length > 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "Purchase Order already exists for this RFQ." });
      return;
    }

    // 2. Generate PO Number
    const poNumber = `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    const subtotal = Number(rfqInfo.subtotal);
    const taxAmount = subtotal * (data.taxRate / 100);
    const total = subtotal + taxAmount;

    // 3. Create PO
    const { rows: poRows } = await client.query(
      `INSERT INTO purchase_orders 
       (po_number, rfq_id, quotation_id, vendor_id, approval_request_id, created_by_id, subtotal, tax_rate, tax_amount, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, po_number as "poNumber", status`,
      [
        poNumber, data.rfqId, rfqInfo.quotationId, rfqInfo.vendorId, 
        rfqInfo.approvalId, user!.id, subtotal, data.taxRate, taxAmount, total
      ]
    );

    // 4. Update RFQ Status
    await client.query(
      `UPDATE rfqs SET status = 'CLOSED', updated_at = NOW() WHERE id = $1`,
      [data.rfqId]
    );

    // 5. Log Activity
    await client.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'PO', $2, 'PO_CREATED', $3)`,
      [user!.id, poRows[0].id, `Purchase Order ${poNumber} generated.`]
    );

    await client.query("COMMIT");
    res.status(201).json(poRows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to create PO" });
    }
  } finally {
    client.release();
  }
});
