import { Router } from "express";
import { requireAuth, requireRoles } from "../auth/auth.middleware.js";
import { db } from "../db/client.js";

export const activityRouter = Router();

activityRouter.get("/", requireAuth, requireRoles(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        a.id, 
        a.action, 
        a.message, 
        a.entity_type as "entityType", 
        a.created_at as "date",
        u.name as "actorName"
      FROM activity_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
});
