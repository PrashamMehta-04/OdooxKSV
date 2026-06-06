import { Router } from "express";
import { requireAuth, requireRoles } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";
import { z } from "zod";

export const vendorsRouter = Router();

const vendorSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  category: z.string().min(1, "Category is required"),
  gstNumber: z.string().optional().nullable(),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional().nullable()
});

vendorsRouter.get("/", requireAuth, requireRoles(["ADMIN", "PROCUREMENT_OFFICER"]), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, company_name as "companyName", category, gst_number as "gstNumber", contact_name as "contactName", email, phone, address, status, rating, created_at as "createdAt", updated_at as "updatedAt"
       FROM vendors
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
});

vendorsRouter.get("/:id", requireAuth, requireRoles(["ADMIN", "PROCUREMENT_OFFICER"]), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, company_name as "companyName", category, gst_number as "gstNumber", contact_name as "contactName", email, phone, address, status, rating, created_at as "createdAt", updated_at as "updatedAt"
       FROM vendors
       WHERE id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Vendor not found" });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vendor" });
  }
});

vendorsRouter.post("/", requireAuth, requireRoles(["ADMIN", "PROCUREMENT_OFFICER"]), async (req, res) => {
  try {
    const data = vendorSchema.parse(req.body);

    const { rows } = await db.query(
      `INSERT INTO vendors (company_name, category, gst_number, contact_name, email, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, company_name as "companyName", category, gst_number as "gstNumber", contact_name as "contactName", email, phone, address, status, rating, created_at as "createdAt", updated_at as "updatedAt"`,
      [data.companyName, data.category, data.gstNumber, data.contactName, data.email, data.phone, data.address]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to create vendor" });
    }
  }
});

vendorsRouter.patch("/:id", requireAuth, requireRoles(["ADMIN", "PROCUREMENT_OFFICER"]), async (req, res) => {
  try {
    const data = vendorSchema.partial().parse(req.body);

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    const fields = [
      { key: 'companyName', col: 'company_name' },
      { key: 'category', col: 'category' },
      { key: 'gstNumber', col: 'gst_number' },
      { key: 'contactName', col: 'contact_name' },
      { key: 'email', col: 'email' },
      { key: 'phone', col: 'phone' },
      { key: 'address', col: 'address' }
    ];

    for (const field of fields) {
      if (data[field.key as keyof typeof data] !== undefined) {
        setClauses.push(`${field.col} = $${paramIdx++}`);
        values.push(data[field.key as keyof typeof data]);
      }
    }

    if (setClauses.length === 0) {
      res.status(400).json({ message: "No valid fields provided for update" });
      return;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const query = `
      UPDATE vendors
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIdx}
      RETURNING id, company_name as "companyName", category, gst_number as "gstNumber", contact_name as "contactName", email, phone, address, status, rating, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
      res.status(404).json({ message: "Vendor not found" });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to update vendor" });
    }
  }
});

vendorsRouter.patch("/:id/status", requireAuth, requireRoles(["ADMIN", "PROCUREMENT_OFFICER"]), async (req, res) => {
  try {
    const statusSchema = z.object({
      status: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "ARCHIVED"])
    });
    const data = statusSchema.parse(req.body);

    const { rows } = await db.query(
      `UPDATE vendors
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, company_name as "companyName", category, gst_number as "gstNumber", contact_name as "contactName", email, phone, address, status, rating, created_at as "createdAt", updated_at as "updatedAt"`,
      [data.status, req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Vendor not found" });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.issues });
    } else {
      res.status(500).json({ message: "Failed to update vendor status" });
    }
  }
});
