import { db } from "./client.js";

async function run() {
  await db.query("BEGIN");
  try {
    // Get users
    const procurer = (await db.query("SELECT id FROM users WHERE role = 'PROCUREMENT_OFFICER' LIMIT 1")).rows[0].id;
    const vendorIdsQuery = await db.query("SELECT id FROM users WHERE role = 'VENDOR'");
    let vendorIds = vendorIdsQuery.rows.map(r => r.id);
    const vendorCompanyIds = (await db.query("SELECT id FROM vendors")).rows.map(r => r.id);
    const manager = (await db.query("SELECT id FROM users WHERE role = 'MANAGER' LIMIT 1")).rows[0].id;

    // 1. A new RFQ that is "SENT" to all 3 vendors (Open for quoting)
    const openRfq = await db.query(
        `INSERT INTO rfqs (title, description, quantity, unit, deadline, status, created_by_id)
         VALUES ($1, $2, $3, $4, $5, 'SENT', $6) RETURNING id`,
        ["Dell Ultrasharp Monitors", "4K resolution monitors for design team", 15, "units", new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), procurer]
    );

    // Give one vendor a submitted quote, other two are pending
    await db.query(
        `INSERT INTO quotations (rfq_id, vendor_id, submitted_by_id, unit_price, total_price, delivery_days, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED')`,
        [openRfq.rows[0].id, vendorCompanyIds[0], vendorIds[0], 25000, 375000, 5]
    );

    // 2. An RFQ in "APPROVAL_PENDING" state, where someone has already compared quotes and selected one
    const approvalRfq = await db.query(
        `INSERT INTO rfqs (title, description, quantity, unit, deadline, status, created_by_id)
         VALUES ($1, $2, $3, $4, $5, 'APPROVAL_PENDING', $6) RETURNING id`,
        ["Logitech MX Master Mice", "High-performance wireless mice", 30, "pcs", new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), procurer]
    );

    const winningQuote = await db.query(
        `INSERT INTO quotations (rfq_id, vendor_id, submitted_by_id, unit_price, total_price, delivery_days, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'SELECTED') RETURNING id`,
        [approvalRfq.rows[0].id, vendorCompanyIds[1], vendorIds[1], 4500, 135000, 3]
    );
    
    // Create the pending approval request for Manager
    await db.query(
        `INSERT INTO approval_requests (rfq_id, quotation_id, requested_by_id, approver_id, status, remarks)
         VALUES ($1, $2, $3, $4, 'PENDING', 'This vendor offered the lowest price and fastest delivery time.')`,
        [approvalRfq.rows[0].id, winningQuote.rows[0].id, procurer, manager]
    );

    await db.query("COMMIT");
    console.log("Seed additional open RFQs Complete!");
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Failed to seed extra data:", err);
  } finally {
    process.exit(0);
  }
}

run();
