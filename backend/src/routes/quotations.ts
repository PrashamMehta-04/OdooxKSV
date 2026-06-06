import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../lib/logger';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/quotations
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, rfqId } = req.query as Record<string, string>;
    const where: any = {};

    // Vendor users only see their own quotations
    if (req.user!.role === 'vendor' && req.user!.vendorId) {
      where.vendorId = req.user!.vendorId;
    }

    if (status) where.status = status;
    if (rfqId) where.rfqId = rfqId;

    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, name: true, email: true, category: true } },
        rfq: { select: { id: true, title: true, deadline: true, status: true } },
        items: { include: { rfqItem: true } },
        approval: true,
      },
    });

    return res.json({ success: true, data: quotations });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations
router.post(
  '/',
  requireRole('vendor', 'admin', 'procurement_officer'),
  [
    body('rfqId').notEmpty().withMessage('RFQ ID is required'),
    body('vendorId').notEmpty().withMessage('Vendor ID is required'),
    body('deliveryTimeline').notEmpty().withMessage('Delivery timeline is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { rfqId, vendorId, deliveryTimeline, notes, items } = req.body;

      // Validate vendor access
      if (req.user!.role === 'vendor' && req.user!.vendorId !== vendorId) {
        return res.status(403).json({ success: false, message: 'You can only submit quotations for your own vendor' });
      }

      // Check RFQ exists and is in sent status
      const rfq = await prisma.rfq.findUnique({
        where: { id: rfqId },
        include: { rfqVendors: true },
      });
      if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
      if (rfq.status !== 'sent') {
        return res.status(400).json({ success: false, message: 'Quotations can only be submitted for sent RFQs' });
      }

      // Check vendor is invited
      const isInvited = rfq.rfqVendors.some((rv) => rv.vendorId === vendorId);
      if (!isInvited) {
        return res.status(403).json({ success: false, message: 'Vendor is not invited to this RFQ' });
      }

      // Check for duplicate quotation
      const existing = await prisma.quotation.findFirst({ where: { rfqId, vendorId } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'A quotation already exists for this vendor and RFQ' });
      }

      // Calculate total
      const totalAmount = items.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);

      const quotation = await prisma.quotation.create({
        data: {
          rfqId,
          vendorId,
          totalAmount,
          deliveryTimeline,
          notes: notes || null,
          items: {
            create: items.map((item: any) => ({
              rfqItemId: item.rfqItemId,
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
              notes: item.notes || null,
            })),
          },
        },
        include: {
          items: { include: { rfqItem: true } },
          vendor: { select: { id: true, name: true, email: true } },
          rfq: { select: { id: true, title: true } },
        },
      });

      await logActivity(req.user!.id, 'quotation', quotation.id, 'created', `Quotation created for RFQ "${rfq.title}"`);

      return res.status(201).json({ success: true, data: quotation });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/quotations/rfq/:rfqId — must be before /:id
router.get('/rfq/:rfqId', requireRole('admin', 'procurement_officer', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const quotations = await prisma.quotation.findMany({
      where: { rfqId: req.params.rfqId },
      include: {
        vendor: { select: { id: true, name: true, email: true, category: true } },
        items: { include: { rfqItem: true } },
        approval: true,
      },
      orderBy: { totalAmount: 'asc' },
    });

    return res.json({ success: true, data: quotations });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotations/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: true,
        rfq: { include: { items: true } },
        items: { include: { rfqItem: true } },
        approval: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
            purchaseOrder: true,
          },
        },
      },
    });

    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    // Vendor can only see their own quotation
    if (req.user!.role === 'vendor' && quotation.vendorId !== req.user!.vendorId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, data: quotation });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/quotations/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    // Vendor can only edit their own quotation
    if (req.user!.role === 'vendor' && quotation.vendorId !== req.user!.vendorId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!['draft'].includes(quotation.status)) {
      return res.status(400).json({ success: false, message: 'Only draft quotations can be updated' });
    }

    const { deliveryTimeline, notes, items } = req.body;

    let totalAmount = quotation.totalAmount;
    if (items && Array.isArray(items)) {
      totalAmount = items.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
      await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } });
      await prisma.quotationItem.createMany({
        data: items.map((item: any) => ({
          quotationId: quotation.id,
          rfqItemId: item.rfqItemId,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          notes: item.notes || null,
        })),
      });
    }

    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: {
        ...(deliveryTimeline && { deliveryTimeline }),
        ...(notes !== undefined && { notes }),
        totalAmount,
      },
      include: { items: { include: { rfqItem: true } }, vendor: true },
    });

    await logActivity(req.user!.id, 'quotation', quotation.id, 'updated', 'Quotation updated');

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations/:id/submit
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { rfq: { select: { id: true, title: true } } },
    });

    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    if (req.user!.role === 'vendor' && quotation.vendorId !== req.user!.vendorId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (quotation.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft quotations can be submitted' });
    }

    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status: 'submitted' },
    });

    await logActivity(req.user!.id, 'quotation', quotation.id, 'submitted', `Quotation submitted for RFQ "${quotation.rfq.title}"`);

    return res.json({ success: true, data: updated, message: 'Quotation submitted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
