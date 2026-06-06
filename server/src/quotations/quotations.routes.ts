import { Router } from "express";
import { requireAuth, requireRoles } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";
import { z } from "zod";

export const quotationsRouter = Router();

const quotationSchema = z.object({
  rfqId: z.string().uuid(),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  deliveryDays: z.number().int().min(1, "Delivery days must be at least 1"),
  notes: z.string().optional().nullable()
});

quotationsRouter.get("/rfq/:rfqId", requireAuth, async (req, res) => {
  try {
    const { user } = req;
    
    // Vendors only see their own quotation for the RFQ
    // Procurement/Admin can see all quotations for the RFQ
    let query = `
      SELECT q.id, q.rfq_id as "rfqId", q.vendor_id as "vendorId", q.submitted_by_id as "submittedById",
             q.unit_price as "unitPrice", q.total_price as "totalPrice", q.delivery_days as "deliveryDays",
             q.notes, q.status, q.submitted_at as "submittedAt", q.created_at as "createdAt",
             v.company_name as "companyName", v.rating as "vendorRating", u.name as "submittedByName"
      FROM quotations q
      JOIN vendors v ON q.vendor_id = v.id
      LEFT JOIN users u ON q.submitted_by_id = u.id
      WHERE q.rfq_id = $1
    `;
    const params: any[] = [req.params.rfqId];

    if (user!.role === "VENDOR") {
      query += ` AND v.email = $2`;
      params.push(user!.email);
    }

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch quotations" });
  }
});

quotationsRouter.post("/", requireAuth, requireRoles(["VENDOR"]), async (req, res) => {
  const client = await db.connect();
  try {
    const data = quotationSchema.parse(req.body);
    const { user } = req;

    await client.query("BEGIN");

    // Get vendor ID from user's email
    const { rows: vendorRows } = await client.query(
      `SELECT id FROM vendors WHERE email = $1`,
      [user!.email]
    );

    if (vendorRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(403).json({ message: "Vendor account not found for this user." });
      return;
    }
    const vendorId = vendorRows[0].id;

    // Check if RFQ exists and is open
    const { rows: rfqRows } = await client.query(
      `SELECT status, quantity, deadline FROM rfqs WHERE id = $1`,
      [data.rfqId]
    );

    if (rfqRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "RFQ not found" });
      return;
    }

    const rfq = rfqRows[0];
    
    // Check deadline
    if (new Date() > new Date(rfq.deadline)) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "The deadline for this RFQ has passed." });
      return;
    }

    // Check if vendor was invited
    const { rows: invRows } = await client.query(
      `SELECT id FROM rfq_vendor_invitations WHERE rfq_id = $1 AND vendor_id = $2`,
      [data.rfqId, vendorId]
    );

    if (invRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(403).json({ message: "You were not invited to this RFQ." });
      return;
    }

    const totalPrice = data.unitPrice * rfq.quantity;

    // Insert quotation
    const { rows: quoteRows } = await client.query(
      `INSERT INTO quotations (rfq_id, vendor_id, submitted_by_id, unit_price, total_price, delivery_days, notes, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUBMITTED', NOW())
       RETURNING id, rfq_id as "rfqId", vendor_id as "vendorId", unit_price as "unitPrice", total_price as "totalPrice", delivery_days as "deliveryDays", notes, status, submitted_at as "submittedAt"`,
      [data.rfqId, vendorId, user!.id, data.unitPrice, totalPrice, data.deliveryDays, data.notes]
    );

    // Update Invitation Status
    await client.query(
      `UPDATE rfq_vendor_invitations SET status = 'QUOTED' WHERE rfq_id = $1 AND vendor_id = $2`,
      [data.rfqId, vendorId]
    );

    // Automatically update RFQ status to QUOTING if it's SENT
    if (rfq.status === 'SENT') {
      await client.query(
        `UPDATE rfqs SET status = 'QUOTING' WHERE id = $1`,
        [data.rfqId]
      );
    }

    // Log Activity
    await client.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'QUOTATION', $2, 'QUOTATION_SUBMITTED', 'Vendor submitted a quotation.')`,
      [user!.id, quoteRows[0].id]
    );

    await client.query("COMMIT");
    res.status(201).json(quoteRows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else if ((err as any).code === '23505') {
      // Unique constraint violation (rfq_id, vendor_id)
      res.status(400).json({ message: "You have already submitted a quotation for this RFQ." });
    } else {
      res.status(500).json({ message: "Failed to submit quotation" });
    }
  } finally {
    client.release();
  }
});

quotationsRouter.patch("/:id", requireAuth, requireRoles(["VENDOR"]), async (req, res) => {
  const client = await db.connect();
  try {
    const data = quotationSchema.omit({ rfqId: true }).partial().parse(req.body);
    const { user } = req;

    await client.query("BEGIN");

    // Check ownership and RFQ deadline
    const { rows: quoteRows } = await client.query(
      `SELECT q.vendor_id, r.deadline, r.quantity, v.email 
       FROM quotations q
       JOIN vendors v ON q.vendor_id = v.id
       JOIN rfqs r ON q.rfq_id = r.id
       WHERE q.id = $1`,
      [req.params.id]
    );

    if (quoteRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Quotation not found" });
      return;
    }

    const quote = quoteRows[0];

    if (quote.email !== user!.email) {
      await client.query("ROLLBACK");
      res.status(403).json({ message: "Not authorized to edit this quotation" });
      return;
    }

    if (new Date() > new Date(quote.deadline)) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "The deadline for this RFQ has passed. Edits are not allowed." });
      return;
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    let newUnitPrice = data.unitPrice;
    
    if (newUnitPrice !== undefined) {
      setClauses.push(`unit_price = $${paramIdx++}`);
      values.push(newUnitPrice);
      
      const totalPrice = newUnitPrice * quote.quantity;
      setClauses.push(`total_price = $${paramIdx++}`);
      values.push(totalPrice);
    }

    if (data.deliveryDays !== undefined) {
      setClauses.push(`delivery_days = $${paramIdx++}`);
      values.push(data.deliveryDays);
    }

    if (data.notes !== undefined) {
      setClauses.push(`notes = $${paramIdx++}`);
      values.push(data.notes);
    }

    if (setClauses.length === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "No fields to update" });
      return;
    }

    setClauses.push(`updated_at = NOW()`);
    setClauses.push(`status = 'REVISED'`);
    values.push(req.params.id);

    const { rows } = await client.query(
      `UPDATE quotations
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIdx}
       RETURNING id, rfq_id as "rfqId", vendor_id as "vendorId", unit_price as "unitPrice", total_price as "totalPrice", delivery_days as "deliveryDays", notes, status, submitted_at as "submittedAt"`,
      values
    );

    await client.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'QUOTATION', $2, 'QUOTATION_REVISED', 'Vendor revised the quotation.')`,
      [user!.id, rows[0].id]
    );

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to update quotation" });
    }
  } finally {
    client.release();
  }
});
