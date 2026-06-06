import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Checking VendorBridge database...\n");

  // ── Skip seed if data already exists (e.g. container restart) ────────────
  const existingUser = await prisma.user.findFirst();
  if (existingUser) {
    console.log("⏭️  Database already seeded — skipping.\n");
    return;
  }

  console.log("🌱 Seeding VendorBridge database...\n");

  // ── Vendors ───────────────────────────────────────────────────────────────
  const vendor1 = await prisma.vendor.create({
    data: {
      name: "TechSupply Co.",
      email: "contact@techsupply.com",
      phone: "+91-9876543210",
      gstNumber: "GST27AABCT1234Z1Z5",
      category: "IT & Electronics",
      status: "active",
      contactPerson: "Rahul Sharma",
      address: "42 Tech Park, Pune, Maharashtra 411001",
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: "OfficeWorld Supplies",
      email: "sales@officeworld.com",
      phone: "+91-9765432109",
      gstNumber: "GST29AABCO5678Z1Z2",
      category: "Office Supplies",
      status: "active",
      contactPerson: "Priya Patel",
      address: "15 Commercial Street, Bengaluru, Karnataka 560001",
    },
  });

  const vendor3 = await prisma.vendor.create({
    data: {
      name: "IndustrialParts Ltd.",
      email: "enquiry@industrialparts.com",
      phone: "+91-9654321098",
      gstNumber: "GST06AABCI9012Z1Z8",
      category: "Industrial Equipment",
      status: "active",
      contactPerson: "Amit Verma",
      address: "Plot 8, Industrial Area Phase II, Noida, UP 201301",
    },
  });

  console.log("✅ Created 3 vendors");

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash("Admin@123", 10);
  const managerPass = await bcrypt.hash("Manager@123", 10);
  const officerPass = await bcrypt.hash("Officer@123", 10);
  const vendorPass = await bcrypt.hash("Vendor@123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@vendorbridge.com",
      password: adminPass,
      name: "Admin User",
      role: "admin",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@vendorbridge.com",
      password: managerPass,
      name: "Sarah Manager",
      role: "manager",
    },
  });

  const officer = await prisma.user.create({
    data: {
      email: "officer@vendorbridge.com",
      password: officerPass,
      name: "John Officer",
      role: "procurement_officer",
    },
  });

  const vendorUser1 = await prisma.user.create({
    data: {
      email: "rahul@techsupply.com",
      password: vendorPass,
      name: "Rahul Sharma",
      role: "vendor",
      vendorId: vendor1.id,
    },
  });

  const vendorUser2 = await prisma.user.create({
    data: {
      email: "priya@officeworld.com",
      password: vendorPass,
      name: "Priya Patel",
      role: "vendor",
      vendorId: vendor2.id,
    },
  });

  const vendorUser3 = await prisma.user.create({
    data: {
      email: "amit@industrialparts.com",
      password: vendorPass,
      name: "Amit Verma",
      role: "vendor",
      vendorId: vendor3.id,
    },
  });

  console.log("✅ Created 6 users (admin, manager, officer, 3 vendor users)");

  // ── RFQ 1 ─────────────────────────────────────────────────────────────────
  const rfq1 = await prisma.rfq.create({
    data: {
      title: "Q4 2024 Laptop & Peripherals Procurement",
      description:
        "Procurement of laptops and accessories for the engineering team expansion.",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: "sent",
      createdById: officer.id,
      items: {
        create: [
          {
            productName: "Business Laptop (i7, 16GB RAM, 512GB SSD)",
            quantity: 20,
            unit: "units",
            description: "Windows 11 Pro",
          },
          {
            productName: "Wireless Mouse",
            quantity: 20,
            unit: "units",
            description: "Ergonomic, 2.4GHz",
          },
          {
            productName: "USB-C Docking Station",
            quantity: 20,
            unit: "units",
            description: "4K support, 7-in-1",
          },
          {
            productName: 'External Monitor 27" 4K',
            quantity: 10,
            unit: "units",
            description: "IPS panel, HDMI + DP",
          },
        ],
      },
      rfqVendors: {
        create: [{ vendorId: vendor1.id }, { vendorId: vendor2.id }],
      },
    },
    include: { items: true },
  });

  // ── RFQ 2 ─────────────────────────────────────────────────────────────────
  const rfq2 = await prisma.rfq.create({
    data: {
      title: "Annual Office Stationery & Furniture",
      description:
        "Annual procurement of office stationery, furniture, and ergonomic equipment.",
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      status: "sent",
      createdById: officer.id,
      items: {
        create: [
          {
            productName: "A4 Copy Paper (500 sheets/ream)",
            quantity: 100,
            unit: "reams",
            description: "80 GSM, white",
          },
          {
            productName: "Ballpoint Pens (box of 50)",
            quantity: 20,
            unit: "boxes",
            description: "Blue ink",
          },
          {
            productName: "Ergonomic Office Chair",
            quantity: 15,
            unit: "units",
            description: "Lumbar support, adjustable height",
          },
          {
            productName: "Standing Desk (height adjustable)",
            quantity: 5,
            unit: "units",
            description: "Electric, dual-motor",
          },
        ],
      },
      rfqVendors: {
        create: [{ vendorId: vendor2.id }, { vendorId: vendor3.id }],
      },
    },
    include: { items: true },
  });

  // ── RFQ 3 (draft) ─────────────────────────────────────────────────────────
  await prisma.rfq.create({
    data: {
      title: "Server Infrastructure Upgrade 2025",
      description:
        "Planning for next-gen server infrastructure to support AI workloads.",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "draft",
      createdById: officer.id,
      items: {
        create: [
          {
            productName: "Rack Server (2U, Dual Xeon)",
            quantity: 4,
            unit: "units",
          },
          {
            productName: "Network Switch (48-port)",
            quantity: 2,
            unit: "units",
          },
          { productName: "UPS 10KVA", quantity: 2, unit: "units" },
        ],
      },
    },
  });

  console.log("✅ Created 3 RFQs (2 sent, 1 draft)");

  // ── Quotations for RFQ 1 ──────────────────────────────────────────────────
  const rfq1Items = rfq1.items;

  const quotation1 = await prisma.quotation.create({
    data: {
      rfqId: rfq1.id,
      vendorId: vendor1.id,
      totalAmount: 1085000,
      deliveryTimeline: "7-10 business days",
      notes:
        "All items are from tier-1 manufacturers. 1-year onsite warranty included.",
      status: "submitted",
      items: {
        create: [
          {
            rfqItemId: rfq1Items[0].id,
            unitPrice: 45000,
            totalPrice: 900000,
            notes: "Dell Latitude 5540",
          },
          {
            rfqItemId: rfq1Items[1].id,
            unitPrice: 1500,
            totalPrice: 30000,
            notes: "Logitech MX Anywhere 3",
          },
          {
            rfqItemId: rfq1Items[2].id,
            unitPrice: 5500,
            totalPrice: 110000,
            notes: "Anker 577 Thunderbolt Hub",
          },
          {
            rfqItemId: rfq1Items[3].id,
            unitPrice: 4500,
            totalPrice: 45000,
            notes: "LG 27UL500-W 4K Monitor",
          },
        ],
      },
    },
  });

  const quotation2 = await prisma.quotation.create({
    data: {
      rfqId: rfq1.id,
      vendorId: vendor2.id,
      totalAmount: 1020000,
      deliveryTimeline: "10-14 business days",
      notes: "Competitive pricing. We can offer bulk discount on next order.",
      status: "submitted",
      items: {
        create: [
          {
            rfqItemId: rfq1Items[0].id,
            unitPrice: 42000,
            totalPrice: 840000,
            notes: "HP EliteBook 845 G10",
          },
          {
            rfqItemId: rfq1Items[1].id,
            unitPrice: 1800,
            totalPrice: 36000,
            notes: "HP 925 Ergonomic Mouse",
          },
          {
            rfqItemId: rfq1Items[2].id,
            unitPrice: 6200,
            totalPrice: 124000,
            notes: "HP USB-C Dock G5",
          },
          {
            rfqItemId: rfq1Items[3].id,
            unitPrice: 2000,
            totalPrice: 20000,
            notes: "Samsung LS27A600NWWXXL",
          },
        ],
      },
    },
  });

  // ── Quotations for RFQ 2 ──────────────────────────────────────────────────
  const rfq2Items = rfq2.items;

  const quotation3 = await prisma.quotation.create({
    data: {
      rfqId: rfq2.id,
      vendorId: vendor2.id,
      totalAmount: 198500,
      deliveryTimeline: "3-5 business days",
      notes: "All stationery items in stock. Furniture has 2-week lead time.",
      status: "submitted",
      items: {
        create: [
          {
            rfqItemId: rfq2Items[0].id,
            unitPrice: 350,
            totalPrice: 35000,
            notes: "JK Copier 80 GSM",
          },
          {
            rfqItemId: rfq2Items[1].id,
            unitPrice: 250,
            totalPrice: 5000,
            notes: "Cello Gripper",
          },
          {
            rfqItemId: rfq2Items[2].id,
            unitPrice: 9500,
            totalPrice: 142500,
            notes: "Featherlite Delta Plus",
          },
          {
            rfqItemId: rfq2Items[3].id,
            unitPrice: 16000,
            totalPrice: 80000,
            notes: "Autonomous SmartDesk Pro",
          },
        ],
      },
    },
  });

  console.log("✅ Created 3 quotations (all submitted)");

  // ── Approval for quotation1 (selected vendor for RFQ 1) ───────────────────
  const approval1 = await prisma.approval.create({
    data: {
      quotationId: quotation1.id,
      approverId: manager.id,
      status: "approved",
      remarks: "Best value with warranty. Approved.",
    },
  });

  // Mark quotation as selected
  await prisma.quotation.update({
    where: { id: quotation1.id },
    data: { status: "selected" },
  });

  // ── Purchase Order from approved quotation ────────────────────────────────
  const po1 = await prisma.purchaseOrder.create({
    data: {
      approvalId: approval1.id,
      poNumber: "PO-2024-001",
      totalAmount: 1280300, // 1085000 + 18% GST
      taxAmount: 195300,
      taxRate: 18,
      status: "active",
    },
  });

  // ── Invoice from PO ───────────────────────────────────────────────────────
  await prisma.invoice.create({
    data: {
      purchaseOrderId: po1.id,
      invoiceNumber: "INV-2024-001",
      totalAmount: 1280300,
      taxAmount: 195300,
      status: "generated",
    },
  });

  // ── Approval for quotation3 (pending) ─────────────────────────────────────
  await prisma.approval.create({
    data: {
      quotationId: quotation3.id,
      approverId: manager.id,
      status: "pending",
    },
  });
  await prisma.quotation.update({
    where: { id: quotation3.id },
    data: { status: "selected" },
  });

  console.log("✅ Created approval, purchase order, and invoice");

  // ── Sample notifications ───────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: vendorUser1.id,
        title: "New RFQ Invitation",
        message: `You have been invited to submit a quotation for RFQ: "${rfq1.title}"`,
        read: true,
      },
      {
        userId: vendorUser2.id,
        title: "New RFQ Invitation",
        message: `You have been invited to submit a quotation for RFQ: "${rfq1.title}"`,
        read: false,
      },
      {
        userId: manager.id,
        title: "Approval Required",
        message: `A quotation from "OfficeWorld Supplies" for RFQ "${rfq2.title}" requires your approval.`,
        read: false,
      },
      {
        userId: officer.id,
        title: "Quotation Approved",
        message: `The quotation from "TechSupply Co." for RFQ "${rfq1.title}" has been approved.`,
        read: false,
      },
    ],
  });

  // ── Activity Logs ─────────────────────────────────────────────────────────
  await prisma.activityLog.createMany({
    data: [
      {
        userId: officer.id,
        entityType: "rfq",
        entityId: rfq1.id,
        action: "created",
        details: `RFQ "${rfq1.title}" created`,
      },
      {
        userId: officer.id,
        entityType: "rfq",
        entityId: rfq1.id,
        action: "sent",
        details: `RFQ sent to 2 vendors`,
      },
      {
        userId: officer.id,
        entityType: "rfq",
        entityId: rfq2.id,
        action: "created",
        details: `RFQ "${rfq2.title}" created`,
      },
      {
        userId: officer.id,
        entityType: "rfq",
        entityId: rfq2.id,
        action: "sent",
        details: `RFQ sent to 2 vendors`,
      },
      {
        userId: vendorUser1.id,
        entityType: "quotation",
        entityId: quotation1.id,
        action: "created",
        details: "Quotation submitted",
      },
      {
        userId: vendorUser2.id,
        entityType: "quotation",
        entityId: quotation2.id,
        action: "created",
        details: "Quotation submitted",
      },
      {
        userId: manager.id,
        entityType: "approval",
        entityId: approval1.id,
        action: "approved",
        details: "Quotation approved",
      },
      {
        userId: officer.id,
        entityType: "purchase_order",
        entityId: po1.id,
        action: "created",
        details: `PO ${po1.poNumber} created`,
      },
    ],
  });

  console.log("✅ Created notifications and activity logs\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Seed complete! Login credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Admin     : admin@vendorbridge.com    / Admin@123");
  console.log("  Manager   : manager@vendorbridge.com  / Manager@123");
  console.log("  Officer   : officer@vendorbridge.com  / Officer@123");
  console.log("  Vendor 1  : rahul@techsupply.com      / Vendor@123");
  console.log("  Vendor 2  : priya@officeworld.com     / Vendor@123");
  console.log("  Vendor 3  : amit@industrialparts.com  / Vendor@123");
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
