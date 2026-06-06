import { Router } from "express";
import { requireAuth, requireRoles } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";
import { z } from "zod";

export const rfqsRouter = Router();

const rfqSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  deadline: z.string().datetime(),
  attachmentUrl: z.string().optional().nullable(),
  vendorIds: z.array(z.string().uuid()).min(1, "At least one vendor must be invited")
});

rfqsRouter.get("/", requireAuth, requireRoles(["PROCUREMENT_OFFICER", "ADMIN", "MANAGER", "VENDOR"]), async (req, res) => {
  try {
    const { user } = req;
    let query = `
      SELECT r.id, r.title, r.description, r.quantity, r.unit, r.attachment_url as "attachmentUrl",
             r.deadline, r.status, r.created_by_id as "createdById", r.created_at as "createdAt",
             u.name as "createdByName"
      FROM rfqs r
      JOIN users u ON r.created_by_id = u.id
    `;
    const params: any[] = [];

    if (user!.role === "VENDOR") {
      // VENDOR can only see RFQs they are invited to
      query += `
        JOIN rfq_vendor_invitations i ON r.id = i.rfq_id
        JOIN vendors v ON i.vendor_id = v.id
        WHERE v.email = $1
      `;
      params.push(user!.email); // Assuming vendor users have same email as vendor record
    }

    query += ` ORDER BY r.created_at DESC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch RFQs" });
  }
});

rfqsRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows: rfqRows } = await db.query(
      `SELECT r.id, r.title, r.description, r.quantity, r.unit, r.attachment_url as "attachmentUrl",
              r.deadline, r.status, r.created_by_id as "createdById", r.created_at as "createdAt",
              u.name as "createdByName"
       FROM rfqs r
       JOIN users u ON r.created_by_id = u.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (rfqRows.length === 0) {
      res.status(404).json({ message: "RFQ not found" });
      return;
    }

    const { rows: invitationRows } = await db.query(
      `SELECT i.id, i.status, i.invited_at as "invitedAt", v.id as "vendorId", v.company_name as "companyName"
       FROM rfq_vendor_invitations i
       JOIN vendors v ON i.vendor_id = v.id
       WHERE i.rfq_id = $1`,
      [req.params.id]
    );

    res.json({
      ...rfqRows[0],
      invitations: invitationRows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch RFQ details" });
  }
});

rfqsRouter.post("/", requireAuth, requireRoles(["PROCUREMENT_OFFICER"]), async (req, res) => {
  const client = await db.connect();
  try {
    const data = rfqSchema.parse(req.body);

    await client.query("BEGIN");

    // Create RFQ
    const { rows: rfqRows } = await client.query(
      `INSERT INTO rfqs (title, description, quantity, unit, deadline, attachment_url, created_by_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SENT')
       RETURNING id, title, description, quantity, unit, attachment_url as "attachmentUrl", deadline, status, created_at as "createdAt"`,
      [data.title, data.description, data.quantity, data.unit, data.deadline, data.attachmentUrl, req.user!.id]
    );
    const rfq = rfqRows[0];

    // Create Invitations
    for (const vendorId of data.vendorIds) {
      await client.query(
        `INSERT INTO rfq_vendor_invitations (rfq_id, vendor_id, status)
         VALUES ($1, $2, 'SENT')`,
        [rfq.id, vendorId]
      );
    }

    // Create Activity Log
    await client.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'RFQ', $2, 'CREATED', $3)`,
      [req.user!.id, rfq.id, `Created RFQ "${rfq.title}" and invited ${data.vendorIds.length} vendor(s).`]
    );

    await client.query("COMMIT");
    res.status(201).json(rfq);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to create RFQ" });
    }
  } finally {
    client.release();
  }
});

rfqsRouter.patch("/:id/status", requireAuth, requireRoles(["PROCUREMENT_OFFICER"]), async (req, res) => {
  try {
    const statusSchema = z.object({
      status: z.enum(['DRAFT', 'SENT', 'QUOTING', 'UNDER_REVIEW', 'APPROVAL_PENDING', 'APPROVED', 'REJECTED', 'CLOSED'])
    });
    const data = statusSchema.parse(req.body);

    const { rows } = await db.query(
      `UPDATE rfqs
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [data.status, req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "RFQ not found" });
      return;
    }

    await db.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'RFQ', $2, 'STATUS_UPDATED', $3)`,
      [req.user!.id, req.params.id, `Updated RFQ status to ${data.status}`]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to update RFQ status" });
    }
  }
});
