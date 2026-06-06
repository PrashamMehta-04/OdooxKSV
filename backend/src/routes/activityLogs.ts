import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/activity-logs
router.get('/', requireRole('admin', 'manager', 'procurement_officer', 'vendor'), async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId, userId, limit = '50', offset = '0' } = req.query as Record<string, string>;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    
    // Scoping for vendors: only see their own logs
    if (req.user!.role === 'vendor') {
      where.userId = req.user!.id;
    } else if (userId) {
      where.userId = userId;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit), 200),
        skip: Number(offset),
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return res.json({ success: true, data: logs, meta: { total, limit: Number(limit), offset: Number(offset) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
