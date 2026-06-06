import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../lib/logger';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/rfqs
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, from, to } = req.query as Record<string, string>;
    const where: any = {};

    // Vendor users only see RFQs they were invited to
    if (req.user!.role === 'vendor' && req.user!.vendorId) {
      where.rfqVendors = { some: { vendorId: req.user!.vendorId } };
    }

    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const rfqs = await prisma.rfq.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        items: true,
        rfqVendors: {
          include: { vendor: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { quotations: true } },
      },
    });

    return res.json({ success: true, data: rfqs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rfqs
router.post(
  '/',
  requireRole('admin', 'procurement_officer'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('deadline').isISO8601().withMessage('Valid deadline date required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productName').notEmpty().withMessage('Product name is required for each item'),
    body('items.*.quantity').isNumeric().withMessage('Quantity must be a number'),
    body('items.*.unit').notEmpty().withMessage('Unit is required for each item'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { title, description, deadline, items, vendorIds = [], attachmentUrl } = req.body;

      const rfq = await prisma.rfq.create({
        data: {
          title,
          description,
          deadline: new Date(deadline),
          attachmentUrl: attachmentUrl || null,
          createdById: req.user!.id,
          items: {
            create: items.map((item: any) => ({
              productName: item.productName,
              quantity: Number(item.quantity),
              unit: item.unit,
              description: item.description || null,
            })),
          },
          rfqVendors: {
            create: vendorIds.map((vid: string) => ({ vendorId: vid })),
          },
        },
        include: {
          items: true,
          rfqVendors: { include: { vendor: { select: { id: true, name: true, email: true } } } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      await logActivity(req.user!.id, 'rfq', rfq.id, 'created', `RFQ "${title}" created`);

      return res.status(201).json({ success: true, data: rfq });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/rfqs/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const rfq = await prisma.rfq.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        items: true,
        rfqVendors: {
          include: { vendor: true },
        },
        quotations: {
          include: {
            vendor: { select: { id: true, name: true, email: true } },
            items: { include: { rfqItem: true } },
          },
        },
      },
    });

    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });

    // Vendor users can only view RFQs they are invited to
    if (req.user!.role === 'vendor' && req.user!.vendorId) {
      const isInvited = rfq.rfqVendors.some((rv) => rv.vendorId === req.user!.vendorId);
      if (!isInvited) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, data: rfq });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/rfqs/:id
router.put(
  '/:id',
  requireRole('admin', 'procurement_officer'),
  async (req: AuthRequest, res: Response) => {
    try {
      const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
      if (rfq.status !== 'draft') {
        return res.status(400).json({ success: false, message: 'Only draft RFQs can be updated' });
      }

      const { title, description, deadline, items, vendorIds, attachmentUrl } = req.body;

      // Update the RFQ base fields
      const updated = await prisma.rfq.update({
        where: { id: req.params.id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(deadline && { deadline: new Date(deadline) }),
          ...(attachmentUrl !== undefined && { attachmentUrl }),
        },
      });

      // Replace items if provided
      if (items && Array.isArray(items)) {
        await prisma.rfqItem.deleteMany({ where: { rfqId: req.params.id } });
        await prisma.rfqItem.createMany({
          data: items.map((item: any) => ({
            rfqId: req.params.id,
            productName: item.productName,
            quantity: Number(item.quantity),
            unit: item.unit,
            description: item.description || null,
          })),
        });
      }

      // Replace vendor assignments if provided
      if (vendorIds && Array.isArray(vendorIds)) {
        await prisma.rfqVendor.deleteMany({ where: { rfqId: req.params.id } });
        await prisma.rfqVendor.createMany({
          data: vendorIds.map((vid: string) => ({ rfqId: req.params.id, vendorId: vid })),
        });
      }

      const full = await prisma.rfq.findUnique({
        where: { id: req.params.id },
        include: {
          items: true,
          rfqVendors: { include: { vendor: { select: { id: true, name: true, email: true } } } },
        },
      });

      await logActivity(req.user!.id, 'rfq', req.params.id, 'updated', `RFQ "${updated.title}" updated`);

      return res.json({ success: true, data: full });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// DELETE /api/rfqs/:id
router.delete(
  '/:id',
  requireRole('admin', 'procurement_officer'),
  async (req: AuthRequest, res: Response) => {
    try {
      const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } });
      if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
      if (!['draft', 'cancelled'].includes(rfq.status)) {
        return res.status(400).json({ success: false, message: 'Only draft or cancelled RFQs can be deleted' });
      }

      await prisma.rfq.delete({ where: { id: req.params.id } });
      await logActivity(req.user!.id, 'rfq', req.params.id, 'deleted', `RFQ "${rfq.title}" deleted`);

      return res.json({ success: true, message: 'RFQ deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/rfqs/:id/send
router.post(
  '/:id/send',
  requireRole('admin', 'procurement_officer'),
  async (req: AuthRequest, res: Response) => {
    try {
      const rfq = await prisma.rfq.findUnique({
        where: { id: req.params.id },
        include: {
          rfqVendors: {
            include: {
              vendor: {
                include: { users: { where: { role: 'vendor' } } },
              },
            },
          },
        },
      });

      if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
      if (rfq.status !== 'draft') {
        return res.status(400).json({ success: false, message: 'Only draft RFQs can be sent' });
      }
      if (rfq.rfqVendors.length === 0) {
        return res.status(400).json({ success: false, message: 'No vendors assigned to this RFQ' });
      }

      // Update status
      const updated = await prisma.rfq.update({
        where: { id: req.params.id },
        data: { status: 'sent' },
      });

      // Create notifications for each vendor user
      const notificationData: any[] = [];
      for (const rv of rfq.rfqVendors) {
        for (const vendorUser of rv.vendor.users) {
          notificationData.push({
            userId: vendorUser.id,
            title: 'New RFQ Invitation',
            message: `You have been invited to submit a quotation for RFQ: "${rfq.title}"`,
          });
        }
      }

      if (notificationData.length > 0) {
        await prisma.notification.createMany({ data: notificationData });
      }

      await logActivity(req.user!.id, 'rfq', rfq.id, 'sent', `RFQ "${rfq.title}" sent to ${rfq.rfqVendors.length} vendor(s)`);

      return res.json({ success: true, data: updated, message: `RFQ sent to ${rfq.rfqVendors.length} vendor(s)` });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
