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

    // Insert extra vendors
    const pass = (await db.query("SELECT password_hash FROM users LIMIT 1")).rows[0].password_hash;
    const v2 = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Sameer Rao', 'quotes@novatech.local', $1, 'VENDOR') RETURNING id`,
        [pass]
    );
    const v3 = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Kavya Singh', 'orders@metrooffice.local', $1, 'VENDOR') RETURNING id`,
        [pass]
    );

    vendorIds.push(v2.rows[0].id, v3.rows[0].id);

    const titles = ["Office Chairs", "Standing Desks", "Developer Laptops", "Monitors", "Networking Gear", "Coffee Machines", "Whiteboards", "Server Racks", "Ergonomic Keyboards", "Webcams", "Conference Tables"];
    const units = ["units", "pcs", "boxes", "kits"];
    
    // Seed 25 Random RFQs and POs over last 6 months
    for (let i = 0; i < 25; i++) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 150)); // Last 5 months
      
      const updatedDate = new Date(pastDate);
      updatedDate.setDate(updatedDate.getDate() + Math.floor(Math.random() * 7) + 2); // Took 2-9 days to close
      
      const vCompanyId = vendorCompanyIds[i % vendorCompanyIds.length];
      const vUserId = vendorIds[i % vendorIds.length];
      const quantity = Math.floor(Math.random() * 50) + 10;
      const unitPrice = Math.floor(Math.random() * 10000) + 500;
      const total = quantity * unitPrice;

      // 1. Create RFQ
      const rfq = await db.query(
        `INSERT INTO rfqs (title, description, quantity, unit, deadline, status, created_by_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'CLOSED', $6, $7, $8) RETURNING id`,
        [titles[i % titles.length] + ` (Batch ${i+1})`, "Requirement for internal project expansions and maintenance.", quantity, units[i % units.length], updatedDate.toISOString(), procurer, pastDate.toISOString(), updatedDate.toISOString()]
      );

      // 2. Create Quote
      const quote = await db.query(
        `INSERT INTO quotations (rfq_id, vendor_id, submitted_by_id, unit_price, total_price, delivery_days, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'SELECTED', $7) RETURNING id`,
        [rfq.rows[0].id, vCompanyId, vUserId, unitPrice, total, Math.floor(Math.random() * 20) + 5, pastDate.toISOString()]
      );

      // 3. Create Approval Request
      const approval = await db.query(
        `INSERT INTO approval_requests (rfq_id, quotation_id, requested_by_id, approver_id, status, remarks, decided_at)
         VALUES ($1, $2, $3, $4, 'APPROVED', 'Looks good to me.', $5) RETURNING id`,
        [rfq.rows[0].id, quote.rows[0].id, procurer, manager, updatedDate.toISOString()]
      );

      // 4. Create PO
      const po = await db.query(
        `INSERT INTO purchase_orders (po_number, rfq_id, quotation_id, vendor_id, approval_request_id, created_by_id, status, subtotal, tax_rate, tax_amount, total, created_at, issued_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'FULFILLED', $7, 18, $8, $9, $10, $10) RETURNING id`,
        [`PO-${Math.floor(Math.random() * 90000) + 10000}`, rfq.rows[0].id, quote.rows[0].id, vCompanyId, approval.rows[0].id, procurer, total, total * 0.18, total * 1.18, updatedDate.toISOString()]
      );

      // 5. Create Invoice
      await db.query(
        `INSERT INTO invoices (invoice_number, purchase_order_id, status, subtotal, tax_rate, tax_amount, total, due_date, created_at)
         VALUES ($1, $2, 'PAID', $3, 18, $4, $5, $6, $7)`,
        [`INV-${Math.floor(Math.random() * 90000) + 10000}`, po.rows[0].id, total, total * 0.18, total * 1.18, new Date(updatedDate.getTime() + 30*24*60*60*1000).toISOString(), updatedDate.toISOString()]
      );
    }

    await db.query("COMMIT");
    console.log("Seed Reports Complete!");
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Failed to seed reports data:", err);
  } finally {
    process.exit(0);
  }
}

run();
