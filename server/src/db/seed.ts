import bcrypt from "bcryptjs";
import { db } from "./client.js";

type UserKey = "admin" | "procurement" | "manager" | "vendor";
type VendorKey = "alpha" | "nova" | "metro";

async function insertOne<T extends { id: string }>(sql: string, values: unknown[]) {
  const result = await db.query<T>(sql, values);
  return result.rows[0];
}

const passwordHash = await bcrypt.hash("VendorBridge@123", 10);

await db.query("BEGIN");

try {
  await db.query(`
    TRUNCATE
      notifications,
      activity_logs,
      invoices,
      purchase_orders,
      approval_timeline_items,
      approval_requests,
      quotations,
      rfq_vendor_invitations,
      rfqs,
      vendors,
      users
    RESTART IDENTITY CASCADE
  `);

  const users: Record<UserKey, { id: string }> = {
    admin: await insertOne(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["Aarav Mehta", "admin@vendorbridge.local", passwordHash, "ADMIN"]
    ),
    procurement: await insertOne(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["Priya Shah", "procurement@vendorbridge.local", passwordHash, "PROCUREMENT_OFFICER"]
    ),
    manager: await insertOne(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["Rohan Iyer", "manager@vendorbridge.local", passwordHash, "MANAGER"]
    ),
    vendor: await insertOne(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["Neha Kapoor", "vendor@vendorbridge.local", passwordHash, "VENDOR"]
    )
  };

  const vendors: Record<VendorKey, { id: string }> = {
    alpha: await insertOne(
      `INSERT INTO vendors
        (company_name, category, gst_number, contact_name, email, phone, address, status, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        "Alpha Industrial Supplies",
        "Industrial Equipment",
        "27AALCA1234A1Z5",
        "Neha Kapoor",
        "sales@alphaindustrial.local",
        "+91-9876543210",
        "Andheri East, Mumbai",
        "ACTIVE",
        4.6
      ]
    ),
    nova: await insertOne(
      `INSERT INTO vendors
        (company_name, category, gst_number, contact_name, email, phone, address, status, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        "Nova Tech Components",
        "Electronics",
        "29AABCN4321B1Z2",
        "Sameer Rao",
        "quotes@novatech.local",
        "+91-9988776655",
        "Peenya, Bengaluru",
        "ACTIVE",
        4.2
      ]
    ),
    metro: await insertOne(
      `INSERT INTO vendors
        (company_name, category, gst_number, contact_name, email, phone, address, status, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        "Metro Office Solutions",
        "Office Supplies",
        "07AABCM9876C1Z8",
        "Kavya Singh",
        "orders@metrooffice.local",
        "+91-9123456780",
        "Connaught Place, New Delhi",
        "PENDING",
        3.9
      ]
    )
  };

  const rfq = await insertOne(
    `INSERT INTO rfqs
      (title, description, quantity, unit, deadline, status, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      "Laptop Docking Stations",
      "USB-C docking stations for the engineering team with dual monitor support.",
      40,
      "units",
      "2026-06-20T18:00:00.000Z",
      "APPROVAL_PENDING",
      users.procurement.id
    ]
  );

  await db.query(
    `INSERT INTO rfq_vendor_invitations (rfq_id, vendor_id, status)
     VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7)`,
    [rfq.id, vendors.alpha.id, "QUOTED", vendors.nova.id, "QUOTED", vendors.metro.id, "SENT"]
  );

  const alphaQuote = await insertOne(
    `INSERT INTO quotations
      (rfq_id, vendor_id, submitted_by_id, unit_price, total_price, delivery_days, notes, status, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      rfq.id,
      vendors.alpha.id,
      users.vendor.id,
      7200,
      288000,
      8,
      "Includes three-year replacement warranty.",
      "SELECTED",
      "2026-06-10T10:30:00.000Z"
    ]
  );

  await insertOne(
    `INSERT INTO quotations
      (rfq_id, vendor_id, submitted_by_id, unit_price, total_price, delivery_days, notes, status, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      rfq.id,
      vendors.nova.id,
      users.vendor.id,
      6950,
      278000,
      14,
      "Lowest quote, delivery in two batches.",
      "SUBMITTED",
      "2026-06-10T12:15:00.000Z"
    ]
  );

  const approval = await insertOne(
    `INSERT INTO approval_requests
      (rfq_id, quotation_id, requested_by_id, approver_id, status, remarks, decided_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      rfq.id,
      alphaQuote.id,
      users.procurement.id,
      users.manager.id,
      "APPROVED",
      "Approved because the selected vendor has faster delivery and stronger warranty terms.",
      "2026-06-11T09:45:00.000Z"
    ]
  );

  await db.query(
    `INSERT INTO approval_timeline_items (approval_request_id, actor_id, action, remarks)
     VALUES ($1, $2, $3, $4), ($1, $5, $6, $7)`,
    [
      approval.id,
      users.procurement.id,
      "PENDING",
      "Submitted Alpha Industrial Supplies quotation for approval.",
      users.manager.id,
      "APPROVED",
      "Approved based on delivery timeline and warranty coverage."
    ]
  );

  const purchaseOrder = await insertOne(
    `INSERT INTO purchase_orders
      (po_number, rfq_id, quotation_id, vendor_id, approval_request_id, created_by_id, status, subtotal, tax_rate, tax_amount, total)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      "PO-2026-0001",
      rfq.id,
      alphaQuote.id,
      vendors.alpha.id,
      approval.id,
      users.procurement.id,
      "ISSUED",
      288000,
      18,
      51840,
      339840
    ]
  );

  await db.query(
    `INSERT INTO invoices
      (invoice_number, purchase_order_id, status, subtotal, tax_rate, tax_amount, total, due_date, emailed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      "INV-2026-0001",
      purchaseOrder.id,
      "SENT",
      288000,
      18,
      51840,
      339840,
      "2026-07-11T00:00:00.000Z",
      "2026-06-11T11:00:00.000Z"
    ]
  );

  await db.query(
    `INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, message)
     VALUES
      ($1, 'RFQ', $2, 'RFQ_CREATED', 'RFQ created and sent to three vendors.'),
      ($3, 'QUOTATION', $4, 'QUOTATION_SUBMITTED', 'Alpha Industrial Supplies submitted a quotation.'),
      ($5, 'APPROVAL', $6, 'APPROVAL_APPROVED', 'Manager approved the selected quotation.'),
      ($1, 'PURCHASE_ORDER', $7, 'PO_ISSUED', 'Purchase order PO-2026-0001 was issued.')`,
    [
      users.procurement.id,
      rfq.id,
      users.vendor.id,
      alphaQuote.id,
      users.manager.id,
      approval.id,
      purchaseOrder.id
    ]
  );

  await db.query(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES
      ($1, 'APPROVAL_ALERT', 'Quotation approved', 'Laptop Docking Stations quotation has been approved.'),
      ($2, 'STATUS_UPDATE', 'Purchase order issued', 'PO-2026-0001 has been issued to Alpha Industrial Supplies.'),
      ($3, 'INVOICE_UPDATE', 'Invoice sent', 'Invoice INV-2026-0001 was generated and emailed.')`,
    [users.manager.id, users.vendor.id, users.admin.id]
  );

  await db.query("COMMIT");
  console.log("Seeded VendorBridge demo data.");
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  await db.end();
}
