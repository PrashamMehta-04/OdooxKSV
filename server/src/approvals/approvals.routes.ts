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

approvalsRouter.get("/", requireAuth, requireRoles(["MANAGER", "PROCUREMENT_OFFICER", "ADMIN"]), async (req, res) => {
  try {
    const { user } = req;
    
    let query = `
      SELECT a.id, a.status, a.requested_at as "requestedAt", a.decided_at as "decidedAt",
             r.title as "rfqTitle", r.id as "rfqId",
             v.company_name as "vendorName",
             q.total_price as "totalPrice",
             req_user.name as "requestedByName"
      FROM approval_requests a
      JOIN rfqs r ON a.rfq_id = r.id
      JOIN quotations q ON a.quotation_id = q.id
      JOIN vendors v ON q.vendor_id = v.id
      JOIN users req_user ON a.requested_by_id = req_user.id
    `;
    
    const params: any[] = [];

    if (user!.role === "MANAGER") {
      query += ` WHERE a.approver_id = $1 `;
      params.push(user!.id);
    }

    query += ` ORDER BY a.requested_at DESC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch approvals" });
  }
});

approvalsRouter.get("/:id", requireAuth, requireRoles(["MANAGER", "PROCUREMENT_OFFICER", "ADMIN"]), async (req, res) => {
  try {
    const { rows: approvalRows } = await db.query(
      `SELECT a.id, a.status, a.remarks, a.requested_at as "requestedAt", a.decided_at as "decidedAt",
              r.title as "rfqTitle", r.id as "rfqId", r.description as "rfqDescription", r.quantity, r.unit,
              v.company_name as "vendorName", v.rating as "vendorRating",
              q.id as "quotationId", q.unit_price as "unitPrice", q.total_price as "totalPrice", q.delivery_days as "deliveryDays", q.notes as "quotationNotes",
              req_user.name as "requestedByName", app_user.name as "approverName"
       FROM approval_requests a
       JOIN rfqs r ON a.rfq_id = r.id
       JOIN quotations q ON a.quotation_id = q.id
       JOIN vendors v ON q.vendor_id = v.id
       JOIN users req_user ON a.requested_by_id = req_user.id
       JOIN users app_user ON a.approver_id = app_user.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (approvalRows.length === 0) {
      res.status(404).json({ message: "Approval request not found" });
      return;
    }

    const { rows: timelineRows } = await db.query(
      `SELECT t.id, t.action, t.remarks, t.created_at as "createdAt", u.name as "actorName"
       FROM approval_timeline_items t
       JOIN users u ON t.actor_id = u.id
       WHERE t.approval_request_id = $1
       ORDER BY t.created_at ASC`,
      [req.params.id]
    );

    res.json({
      ...approvalRows[0],
      timeline: timelineRows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch approval details" });
  }
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

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().min(1, "Remarks are required for decisions.")
});

approvalsRouter.patch("/:id/decision", requireAuth, requireRoles(["MANAGER"]), async (req, res) => {
  const client = await db.connect();
  try {
    const data = decisionSchema.parse(req.body);
    const { user } = req;

    await client.query("BEGIN");

    const { rows: appRows } = await client.query(
      `SELECT status, rfq_id, quotation_id, requested_by_id, approver_id FROM approval_requests WHERE id = $1`,
      [req.params.id]
    );

    if (appRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Approval request not found" });
      return;
    }

    const approval = appRows[0];

    if (approval.status !== 'PENDING') {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "This request has already been decided." });
      return;
    }

    if (approval.approver_id !== user!.id) {
      await client.query("ROLLBACK");
      res.status(403).json({ message: "You are not the designated approver for this request." });
      return;
    }

    // Update approval request
    const { rows } = await client.query(
      `UPDATE approval_requests 
       SET status = $1, remarks = $2, decided_at = NOW() 
       WHERE id = $3 
       RETURNING id, status`,
      [data.status, data.remarks, req.params.id]
    );

    // Create timeline item
    await client.query(
      `INSERT INTO approval_timeline_items (approval_request_id, actor_id, action, remarks)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, user!.id, data.status, data.remarks]
    );

    // Update RFQ status
    await client.query(
      `UPDATE rfqs SET status = $1, updated_at = NOW() WHERE id = $2`,
      [data.status, approval.rfq_id] // Matches APPROVED or REJECTED exactly!
    );

    // If rejected, mark the quotation as REJECTED so another can be chosen
    if (data.status === 'REJECTED') {
      await client.query(
        `UPDATE quotations SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
        [approval.quotation_id]
      );
    }

    // Log Activity
    await client.query(
      `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
       VALUES ($1, 'APPROVAL', $2, $3, $4)`,
      [user!.id, req.params.id, `APPROVAL_${data.status}`, `Manager ${data.status.toLowerCase()} the request.`]
    );

    // Create Notification for Procurement Officer
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'STATUS_UPDATE', $2, $3)`,
      [
        approval.requested_by_id, 
        `Quotation ${data.status}`, 
        `Your quotation approval request has been ${data.status.toLowerCase()}.`
      ]
    );

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to record decision" });
    }
  } finally {
    client.release();
  }
});
