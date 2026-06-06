import { Router } from "express";
import { requireAuth, requireRoles } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";
import { z } from "zod";

export const invoicesRouter = Router();

const createInvoiceSchema = z.object({
  purchaseOrderId: z.string().uuid()
});

invoicesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const { user } = req;
    
    let query = `
      SELECT i.id, i.invoice_number as "invoiceNumber", i.status, i.total, i.created_at as "createdAt",
             p.po_number as "poNumber", v.company_name as "vendorName"
      FROM invoices i
      JOIN purchase_orders p ON i.purchase_order_id = p.id
      JOIN vendors v ON p.vendor_id = v.id
    `;
    
    const params: any[] = [];

    if (user!.role === "VENDOR") {
      query += ` WHERE v.email = $1 `;
      params.push(user!.email);
    }

    query += ` ORDER BY i.created_at DESC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

invoicesRouter.post("/", requireAuth, requireRoles(["VENDOR"]), async (req, res) => {
  const client = await db.connect();
  try {
    const data = createInvoiceSchema.parse(req.body);
    const { user } = req;

    await client.query("BEGIN");

    // 1. Verify PO exists and belongs to this vendor
    const { rows: poRows } = await client.query(
      `SELECT p.id, p.subtotal, p.tax_rate as "taxRate", p.tax_amount as "taxAmount", p.total, p.status, p.vendor_id as "vendorId"
       FROM purchase_orders p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE p.id = $1 AND v.email = $2`,
      [data.purchaseOrderId, user!.email]
    );

    if (poRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Purchase Order not found or unauthorized." });
      return;
    }

    const po = poRows[0];

    if (po.status === 'COMPLETED' || po.status === 'CANCELLED') {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "Cannot create invoice for COMPLETED or CANCELLED PO." });
      return;
    }

    // Check if Invoice already exists
    const { rows: existingInv } = await client.query(
      `SELECT id FROM invoices WHERE purchase_order_id = $1`,
      [data.purchaseOrderId]
    );

    if (existingInv.length > 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "Invoice already exists for this PO." });
      return;
    }

    // 2. Generate Invoice Number
    const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Create Invoice (mirroring PO amounts)
    const { rows: invRows } = await client.query(
      `INSERT INTO invoices 
       (invoice_number, purchase_order_id, status, subtotal, tax_rate, tax_amount, total, due_date)
       VALUES ($1, $2, 'SENT', $3, $4, $5, $6, NOW() + INTERVAL '30 days')
       RETURNING id, invoice_number as "invoiceNumber", status`,
      [
        invoiceNumber, data.purchaseOrderId, 
        po.subtotal, po.taxRate, po.taxAmount, po.total
      ]
    );

    await client.query(
      `UPDATE purchase_orders SET status = 'FULFILLED', updated_at = NOW() WHERE id = $1`,
      [data.purchaseOrderId]
    );

    // 5. Log Activity
    await client.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'INVOICE', $2, 'INVOICE_SENT', $3)`,
      [user!.id, invRows[0].id, `Invoice ${invoiceNumber} submitted for PO.`]
    );

    await client.query("COMMIT");
    res.status(201).json(invRows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to submit invoice" });
    }
  } finally {
    client.release();
  }
});

const payInvoiceSchema = z.object({
  status: z.enum(["PAID", "REJECTED"])
});

invoicesRouter.patch("/:id/pay", requireAuth, requireRoles(["PROCUREMENT_OFFICER", "ADMIN"]), async (req, res) => {
  const client = await db.connect();
  try {
    const data = payInvoiceSchema.parse(req.body);
    const { user } = req;

    await client.query("BEGIN");

    const { rows: invRows } = await client.query(
      `SELECT status, purchase_order_id FROM invoices WHERE id = $1`,
      [req.params.id]
    );

    if (invRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Invoice not found" });
      return;
    }

    if (invRows[0].status !== 'SENT') {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "Invoice must be in SENT status to process payment." });
      return;
    }

    // Update invoice status
    const { rows } = await client.query(
      `UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [data.status, req.params.id]
    );

    // Update PO status is not needed since it's already FULFILLED

    // Log Activity
    await client.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'INVOICE', $2, $3, $4)`,
      [user!.id, req.params.id, `INVOICE_${data.status}`, `Invoice marked as ${data.status}.`]
    );

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to process invoice payment" });
  } finally {
    client.release();
  }
});
