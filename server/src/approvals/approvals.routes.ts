import { Router } from "express";
import { requireAuth, requireRoles } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";
import { z } from "zod";

export const approvalsRouter = Router();

const requestSchema = z.object({
  rfqId: z.string().uuid(),
  quotationId: z.string().uuid(),
  approverId: z.string().uuid()
});

approvalsRouter.post("/request", requireAuth, requireRoles(["PROCUREMENT_OFFICER"]), async (req, res) => {
  const client = await db.connect();
  try {
    const data = requestSchema.parse(req.body);
    const { user } = req;

    await client.query("BEGIN");

    // Check if RFQ is already in approval
    const { rows: rfqRows } = await client.query(
      `SELECT status FROM rfqs WHERE id = $1`,
      [data.rfqId]
    );

    if (rfqRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "RFQ not found" });
      return;
    }

    if (['APPROVAL_PENDING', 'APPROVED', 'CLOSED'].includes(rfqRows[0].status)) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "RFQ is already in approval or closed." });
      return;
    }

    // Create approval request
    const { rows: reqRows } = await client.query(
      `INSERT INTO approval_requests (rfq_id, quotation_id, requested_by_id, approver_id, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id, status`,
      [data.rfqId, data.quotationId, user!.id, data.approverId]
    );

    const approvalRequestId = reqRows[0].id;

    // Create timeline item
    await client.query(
      `INSERT INTO approval_timeline_items (approval_request_id, actor_id, action, remarks)
       VALUES ($1, $2, 'PENDING', 'Quotation selected and submitted for manager approval.')`,
      [approvalRequestId, user!.id]
    );

    // Update RFQ status
    await client.query(
      `UPDATE rfqs SET status = 'APPROVAL_PENDING', updated_at = NOW() WHERE id = $1`,
      [data.rfqId]
    );

    // Update Quotation status
    await client.query(
      `UPDATE quotations SET status = 'SELECTED', updated_at = NOW() WHERE id = $1`,
      [data.quotationId]
    );

    // Log Activity
    await client.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'APPROVAL', $2, 'APPROVAL_REQUESTED', 'Approval requested for selected quotation.')`,
      [user!.id, approvalRequestId]
    );

    // Create Notification for Manager
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'APPROVAL_ALERT', 'New Approval Request', 'A new quotation requires your approval.')`,
      [data.approverId]
    );

    await client.query("COMMIT");
    res.status(201).json(reqRows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to request approval" });
    }
  } finally {
    client.release();
  }
});
