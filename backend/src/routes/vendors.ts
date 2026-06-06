import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../lib/logger';
import { AuthRequest } from '../types';

const router = Router();

// All vendor routes require authentication
router.use(authenticate);

// GET /api/vendors
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, status } = req.query as Record<string, string>;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { contactPerson: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { quotations: true, rfqVendors: true } },
      },
    });

    return res.json({ success: true, data: vendors });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/vendors
router.post(
  '/',
  requireRole('admin', 'procurement_officer'),
  [
    body('name').notEmpty().withMessage('Vendor name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('contactPerson').notEmpty().withMessage('Contact person is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { name, email, phone, gstNumber, category, contactPerson, address, status } = req.body;

      const existing = await prisma.vendor.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'A vendor with this email already exists' });
      }

      const vendor = await prisma.vendor.create({
        data: { name, email, phone, gstNumber, category, contactPerson, address, status: status || 'active' },
      });

      await logActivity(req.user!.id, 'vendor', vendor.id, 'created', `Vendor "${name}" created`);

      return res.status(201).json({ success: true, data: vendor });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/vendors/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { rfq: { select: { id: true, title: true, status: true } } },
        },
        _count: { select: { quotations: true, rfqVendors: true } },
      },
    });

    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    return res.json({ success: true, data: vendor });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/vendors/:id
router.put(
  '/:id',
  requireRole('admin', 'procurement_officer'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, email, phone, gstNumber, category, contactPerson, address, status } = req.body;

      const existing = await prisma.vendor.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Vendor not found' });

      const vendor = await prisma.vendor.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone && { phone }),
          ...(gstNumber !== undefined && { gstNumber }),
          ...(category && { category }),
          ...(contactPerson && { contactPerson }),
          ...(address !== undefined && { address }),
          ...(status && { status }),
        },
      });

      await logActivity(req.user!.id, 'vendor', vendor.id, 'updated', `Vendor "${vendor.name}" updated`);

      return res.json({ success: true, data: vendor });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// DELETE /api/vendors/:id
router.delete(
  '/:id',
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const existing = await prisma.vendor.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Vendor not found' });

      await prisma.vendor.delete({ where: { id: req.params.id } });

      await logActivity(req.user!.id, 'vendor', req.params.id, 'deleted', `Vendor "${existing.name}" deleted`);

      return res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
