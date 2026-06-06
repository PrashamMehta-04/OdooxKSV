import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../lib/logger';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count();
  return `PO-${year}-${String(count + 1).padStart(3, '0')}`;
}

// GET /api/purchase-orders
router.get('/', requireRole('admin', 'procurement_officer', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        approval: {
          include: {
            quotation: {
              include: {
                vendor: { select: { id: true, name: true, email: true } },
                rfq: { select: { id: true, title: true } },
              },
            },
            approver: { select: { id: true, name: true } },
          },
        },
        invoice: true,
      },
    });

    return res.json({ success: true, data: orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchase-orders
router.post(
  '/',
  requireRole('admin', 'procurement_officer', 'manager'),
  [body('approvalId').notEmpty().withMessage('Approval ID is required')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { approvalId, taxRate = 18 } = req.body;

      const approval = await prisma.approval.findUnique({
        where: { id: approvalId },
        include: {
          quotation: {
            include: {
              vendor: true,
              rfq: true,
              items: true,
            },
          },
          purchaseOrder: true,
        },
      });

      if (!approval) return res.status(404).json({ success: false, message: 'Approval not found' });
      if (approval.status !== 'approved') {
        return res.status(400).json({ success: false, message: 'Purchase orders can only be created from approved quotations' });
      }
      if (approval.purchaseOrder) {
        return res.status(409).json({ success: false, message: 'A purchase order already exists for this approval' });
      }

      const subtotal = approval.quotation.totalAmount;
      const rate = Number(taxRate);
      const taxAmount = parseFloat(((subtotal * rate) / 100).toFixed(2));
      const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));
      const poNumber = await generatePoNumber();

      const po = await prisma.purchaseOrder.create({
        data: {
          approvalId,
          poNumber,
          totalAmount,
          taxAmount,
          taxRate: rate,
          status: 'active',
        },
        include: {
          approval: {
            include: {
              quotation: {
                include: {
                  vendor: { select: { id: true, name: true, email: true } },
                  rfq: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
      });

      await logActivity(
        req.user!.id,
        'purchase_order',
        po.id,
        'created',
        `PO ${poNumber} created for quotation from "${approval.quotation.vendor.name}"`
      );

      return res.status(201).json({ success: true, data: po });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/purchase-orders/:id
router.get('/:id', requireRole('admin', 'procurement_officer', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        approval: {
          include: {
            quotation: {
              include: {
                vendor: true,
                rfq: { include: { items: true } },
                items: { include: { rfqItem: true } },
              },
            },
            approver: { select: { id: true, name: true, email: true } },
          },
        },
        invoice: true,
      },
    });

    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    return res.json({ success: true, data: po });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/purchase-orders/:id (update status)
router.put('/:id', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status },
    });

    await logActivity(req.user!.id, 'purchase_order', po.id, 'updated', `PO ${po.poNumber} status changed to ${status}`);

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
