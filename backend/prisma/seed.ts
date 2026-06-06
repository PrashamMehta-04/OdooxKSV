import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const vendorCategories = [
  "IT & Electronics",
  "Office Supplies",
  "Industrial Equipment",
  "Catering Services",
  "Cleaning Services",
  "Logistics & Shipping",
  "Marketing & Advertising",
  "Consulting",
  "Furniture",
  "Construction",
];

const units = ["units", "reams", "boxes", "kg", "meters", "hours", "days"];

async function main() {
  console.log("🌱 Cleaning up existing transaction data...\n");
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.rfqVendor.deleteMany();
  await prisma.rfqItem.deleteMany();
  await prisma.rfq.deleteMany();

  console.log("🌱 Seeding VendorBridge database with realistic dummy data...\n");

  const adminPass = await bcrypt.hash("Admin@123", 10);
  const managerPass = await bcrypt.hash("Manager@123", 10);
  const officerPass = await bcrypt.hash("Officer@123", 10);
  const vendorPass = await bcrypt.hash("Vendor@123", 10);

  // ── Users ─────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@vendorbridge.com" },
    update: {},
    create: {
      email: "admin@vendorbridge.com",
      password: adminPass,
      name: "System Admin",
      role: "admin",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@vendorbridge.com" },
    update: {},
    create: {
      email: "manager@vendorbridge.com",
      password: managerPass,
      name: "Sarah Chen",
      role: "manager",
    },
  });

  const officer1 = await prisma.user.upsert({
    where: { email: "officer1@vendorbridge.com" },
    update: {},
    create: {
      email: "officer1@vendorbridge.com",
      password: officerPass,
      name: "James Wilson",
      role: "procurement_officer",
    },
  });

  const officer2 = await prisma.user.upsert({
    where: { email: "officer2@vendorbridge.com" },
    update: {},
    create: {
      email: "officer2@vendorbridge.com",
      password: officerPass,
      name: "Emily Rodriguez",
      role: "procurement_officer",
    },
  });

  console.log("✅ Created/Verified core users (admin, manager, 2 officers)");

  // ── Vendors ───────────────────────────────────────────────────────────────
  const vendors = [];
  const vendorData = [
    { name: "Global Tech Solutions", category: "IT & Electronics", email: "sales@globaltech.com" },
    { name: "EcoOffice Supplies", category: "Office Supplies", email: "info@ecooffice.com" },
    { name: "Precision Machining Ltd", category: "Industrial Equipment", email: "contact@precision.com" },
    { name: "Gourmet Catering Co", category: "Catering Services", email: "events@gourmet.com" },
    { name: "Sparkle Clean Services", category: "Cleaning Services", email: "service@sparkle.com" },
    { name: "Swift Logistics", category: "Logistics & Shipping", email: "ops@swiftlogistics.com" },
    { name: "Creative Edge Marketing", category: "Marketing & Advertising", email: "hello@creativeedge.com" },
    { name: "Elite Consulting Group", category: "Consulting", email: "partner@eliteconsulting.com" },
    { name: "Modern Spaces Furniture", category: "Furniture", email: "designs@modernspaces.com" },
    { name: "Reliable Build & Co", category: "Construction", email: "projects@reliablebuild.com" },
    { name: "Circuit Masters", category: "IT & Electronics", email: "support@circuitmasters.com" },
    { name: "PaperTrail Supplies", category: "Office Supplies", email: "orders@papertrail.com" },
  ];

  for (const data of vendorData) {
    const v = await prisma.vendor.upsert({
      where: { email: data.email },
      update: {},
      create: {
        name: data.name,
        email: data.email,
        phone: `+91-${Math.floor(7000000000 + Math.random() * 2999999999)}`,
        gstNumber: `GST${Math.floor(10 + Math.random() * 89)}AABC${Math.floor(1000 + Math.random() * 8999)}Z${Math.floor(1 + Math.random() * 9)}Z${Math.floor(1 + Math.random() * 9)}`,
        category: data.category,
        status: "active",
        contactPerson: `${data.name.split(" ")[0]} Representative`,
        address: `${Math.floor(10 + Math.random() * 900)} Business District, Metro City`,
        rating: 3.5 + Math.random() * 1.5,
      },
    });
    vendors.push(v);

    // Create a user for each vendor
    await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        password: vendorPass,
        name: `${data.name} Admin`,
        role: "vendor",
        vendorId: v.id,
      },
    });
  }

  console.log(`✅ Created/Verified ${vendors.length} vendors and their users`);

  // ── RFQs ──────────────────────────────────────────────────────────────────
  const rfqTitles = [
    "Annual Laptop Refresh - Engineering", "Office Stationery Bulk Order Q1", "Heavy Duty Lathe Machine Parts",
    "Corporate Event Catering - July", "Monthly Facility Deep Cleaning", "International Shipping Contract 2024",
    "Brand Awareness Campaign - Phase 2", "Management Strategy Workshop", "Ergonomic Chairs for New Floor",
    "Warehouse Roof Repair", "Cloud Server Subscription Renewal", "Printer Toner & Maintenance",
    "Security System Upgrade", "Breakroom Supplies - Annual", "Legal Consulting Retainer",
    "Vehicle Fleet Maintenance", "HVAC System Service", "Website Re-design Project",
    "Employee Wellness Program", "Network Infrastructure Audit", "Customer Support Software License",
    "Marketing Asset Design", "R&D Lab Equipment", "Safety Gear & PPE",
  ];

  const possibleStatuses: ("draft" | "sent" | "closed" | "cancelled")[] = ["sent", "closed", "sent", "closed", "draft", "sent", "sent", "sent", "sent", "cancelled", "sent", "sent"];

  console.log("🌱 Generating 100 RFQs spread over 12 months...");
  for (let i = 0; i < 100; i++) {
    const title = `${rfqTitles[i % rfqTitles.length]} #${Math.floor(i / rfqTitles.length) + 1}`;
    const status = possibleStatuses[i % possibleStatuses.length];
    const officer = i % 2 === 0 ? officer1 : officer2;
    
    // Create RFQs spread over the last 12 months
    const createdAt = new Date();
    createdAt.setUTCMonth(createdAt.getUTCMonth() - Math.floor(Math.random() * 12));
    createdAt.setUTCDate(Math.floor(1 + Math.random() * 28));
    createdAt.setUTCHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 59));

    const rfq = await prisma.rfq.create({
      data: {
        title: title,
        description: `Standard procurement request for ${title.toLowerCase()}. Required by end of month.`,
        deadline: new Date(createdAt.getTime() + (15 + Math.random() * 15) * 24 * 60 * 60 * 1000),
        status: status,
        createdById: officer.id,
        createdAt: createdAt,
        items: {
          create: Array.from({ length: 3 + Math.floor(Math.random() * 3) }).map((_, idx) => ({
            productName: `Item ${idx + 1} for ${title}`,
            quantity: Math.floor(1 + Math.random() * 50),
            unit: units[Math.floor(Math.random() * units.length)],
            description: "Generic specification requirement",
          })),
        },
      },
      include: { items: true },
    });

    if (status === "sent" || status === "closed") {
      // Invite 3-4 random vendors
      const invitedVendors = [...vendors].sort(() => 0.5 - Math.random()).slice(0, 3 + Math.floor(Math.random() * 2));
      for (const v of invitedVendors) {
        await prisma.rfqVendor.create({
          data: {
            rfqId: rfq.id,
            vendorId: v.id,
          },
        });

        // Create quotations for sent/closed RFQs
        const rand = Math.random();
        if (rand > 0.2) { // 80% chance to have some interaction
          const totalAmount = 10000 + Math.random() * 90000;
          
          // Determine status: draft, submitted, selected, or rejected
          let qStatus: "draft" | "submitted" | "selected" | "rejected" = "submitted";
          if (status === "closed") {
            qStatus = Math.random() > 0.5 ? "selected" : "rejected";
          } else {
            // For 'sent' RFQs, some are still drafts, some submitted
            const subRand = Math.random();
            if (subRand < 0.2) qStatus = "draft";
            else if (subRand < 0.8) qStatus = "submitted";
            else qStatus = "selected"; // Under review
          }
          
          const qCreatedAt = new Date(createdAt.getTime() + (2 + Math.random() * 5) * 24 * 60 * 60 * 1000);

          const quotation = await prisma.quotation.create({
            data: {
              rfqId: rfq.id,
              vendorId: v.id,
              totalAmount: totalAmount,
              deliveryTimeline: `${Math.floor(5 + Math.random() * 15)} days`,
              notes: "Standard terms and conditions apply.",
              status: qStatus,
              createdAt: qCreatedAt,
              items: {
                create: rfq.items.map((item) => ({
                  rfqItemId: item.id,
                  unitPrice: totalAmount / rfq.items.length / item.quantity,
                  totalPrice: totalAmount / rfq.items.length,
                })),
              },
            },
          });

          // Create approvals for 'selected' (under review) or 'approved' quotations
          if (qStatus === "selected" || qStatus === "rejected") {
            const isApproved = status === "closed" && qStatus === "selected";
            const appStatus = isApproved ? "approved" : (qStatus === "rejected" ? "rejected" : "pending");
            
            const approvalCreatedAt = new Date(qCreatedAt.getTime() + (1 + Math.random() * 3) * 24 * 60 * 60 * 1000);
            const approval = await prisma.approval.create({
              data: {
                quotationId: quotation.id,
                approverId: manager.id,
                status: appStatus,
                remarks: appStatus === "approved" ? "Competitive pricing." : (appStatus === "rejected" ? "Budget exceeded." : null),
                createdAt: approvalCreatedAt,
              },
            });

            if (appStatus === "approved") {
              const poCreatedAt = new Date(approvalCreatedAt.getTime() + (1 + Math.random() * 2) * 24 * 60 * 60 * 1000);
              const po = await prisma.purchaseOrder.create({
                data: {
                  approvalId: approval.id,
                  poNumber: `PO-${poCreatedAt.getUTCFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`,
                  totalAmount: totalAmount * 1.18,
                  taxAmount: totalAmount * 0.18,
                  taxRate: 18,
                  status: "active",
                  createdAt: poCreatedAt,
                },
              });

              if (Math.random() > 0.5) {
                const invCreatedAt = new Date(poCreatedAt.getTime() + (3 + Math.random() * 7) * 24 * 60 * 60 * 1000);
                await prisma.invoice.create({
                  data: {
                    purchaseOrderId: po.id,
                    invoiceNumber: `INV-${invCreatedAt.getUTCFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`,
                    totalAmount: po.totalAmount,
                    taxAmount: po.taxAmount,
                    status: Math.random() > 0.5 ? "paid" : "sent",
                    createdAt: invCreatedAt,
                  },
                });
              }
            }
          }
        }
      }
    }
  }

  console.log("✅ Created RFQs with random distributions of quotations, approvals, POs, and invoices");

  // ── Sample notifications ───────────────────────────────────────────────────
  const allUsers = await prisma.user.findMany();
  await prisma.notification.createMany({
    data: Array.from({ length: 20 }).map(() => ({
      userId: allUsers[Math.floor(Math.random() * allUsers.length)].id,
      title: "System Update",
      message: "New procurement guidelines have been uploaded to the portal.",
      read: Math.random() > 0.5,
    })),
  });

  // ── Activity Logs ─────────────────────────────────────────────────────────
  console.log("🌱 Generating activity logs...");
  const allRfqs = await prisma.rfq.findMany();
  const allQuotations = await prisma.quotation.findMany();
  const allApprovals = await prisma.approval.findMany();
  const allPos = await prisma.purchaseOrder.findMany();

  const activityLogs = [];

  for (const rfq of allRfqs) {
    activityLogs.push({
      userId: rfq.createdById,
      entityType: "rfq",
      entityId: rfq.id,
      action: "created",
      details: `RFQ "${rfq.title}" was created by ${rfq.createdById === officer1.id ? "James Wilson" : "Emily Rodriguez"}`,
      createdAt: new Date(rfq.createdAt.getTime() - 1000 * 60 * 60), // 1 hour before
    });
    if (rfq.status !== "draft") {
      activityLogs.push({
        userId: rfq.createdById,
        entityType: "rfq",
        entityId: rfq.id,
        action: "sent",
        details: `RFQ "${rfq.title}" was sent to invited vendors`,
        createdAt: rfq.createdAt,
      });
    }
  }

  for (const q of allQuotations) {
    const v = vendors.find(vend => vend.id === q.vendorId);
    activityLogs.push({
      userId: (await prisma.user.findFirst({ where: { vendorId: q.vendorId } }))?.id || admin.id,
      entityType: "quotation",
      entityId: q.id,
      action: "submitted",
      details: `Quotation submitted by ${v?.name || "Vendor"}`,
      createdAt: q.createdAt,
    });
  }

  for (const app of allApprovals) {
    activityLogs.push({
      userId: app.approverId,
      entityType: "approval",
      entityId: app.id,
      action: "approved",
      details: `Quotation approved by Sarah Chen`,
      createdAt: app.createdAt,
    });
  }

  for (const po of allPos) {
    activityLogs.push({
      userId: officer1.id,
      entityType: "purchase_order",
      entityId: po.id,
      action: "created",
      details: `Purchase Order ${po.poNumber} generated`,
      createdAt: po.createdAt,
    });
  }

  await prisma.activityLog.createMany({
    data: activityLogs,
  });

  console.log(`✅ Created ${activityLogs.length} activity logs`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Seed complete! Realistic data is now available.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Admin     : admin@vendorbridge.com    / Admin@123");
  console.log("  Manager   : manager@vendorbridge.com  / Manager@123");
  console.log("  Officer 1 : officer1@vendorbridge.com / Officer@123");
  console.log("  Officer 2 : officer2@vendorbridge.com / Officer@123");
  console.log("  Vendors   : [Use email from list above] / Vendor@123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
