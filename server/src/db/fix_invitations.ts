import { db } from "./client.js";

async function run() {
  await db.query("BEGIN");
  try {
    // Find RFQs without invitations
    const rfqs = await db.query(`
      SELECT id FROM rfqs 
      WHERE id NOT IN (SELECT DISTINCT rfq_id FROM rfq_vendor_invitations)
    `);

    const vendorCompanyIds = (await db.query("SELECT id FROM vendors")).rows.map(r => r.id);

    for (const rfq of rfqs.rows) {
      for (let i = 0; i < vendorCompanyIds.length; i++) {
        // Check if there is already a quote from this vendor
        const quote = await db.query(`
          SELECT id FROM quotations WHERE rfq_id = $1 AND vendor_id = $2
        `, [rfq.id, vendorCompanyIds[i]]);

        const status = quote.rows.length > 0 ? 'QUOTED' : 'SENT';

        await db.query(`
          INSERT INTO rfq_vendor_invitations (rfq_id, vendor_id, status)
          VALUES ($1, $2, $3)
        `, [rfq.id, vendorCompanyIds[i], status]);
      }
    }

    await db.query("COMMIT");
    console.log("Fixed missing invitations!");
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Failed to fix invitations:", err);
  } finally {
    process.exit(0);
  }
}

run();
