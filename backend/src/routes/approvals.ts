import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../lib/logger';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/approvals
router.get('/', requireRole('admin', 'manager', 'procurement_officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;

    const approvals = await prisma.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        quotation: {
          include: {
            vendor: { select: { id: true, name: true, email: true } },
            rfq: { select: { id: true, title: true, deadline: true } },
            items: { include: { rfqItem: true } },
          },
        },
        approver: { select: { id: true, name: true, email: true } },
        purchaseOrder: true,
      },
    });

    return res.json({ success: true, data: approvals });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/approvals
router.post(
  '/',
  requireRole('admin', 'procurement_officer'),
  [body('quotationId').notEmpty().withMessage('Quotation ID is required')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { quotationId, approverId } = req.body;

      const quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
        include: { rfq: true, vendor: true },
      });
      if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
      if (quotation.status !== 'submitted') {
        return res.status(400).json({ success: false, message: 'Quotation must be in submitted status to request approval' });
      }

      const existingApproval = await prisma.approval.findUnique({ where: { quotationId } });
      if (existingApproval) {
        return res.status(409).json({ success: false, message: 'An approval request already exists for this quotation' });
      }

      // Determine approver: use provided approverId or find a manager
      let resolvedApproverId = approverId;
      if (!resolvedApproverId) {
        const manager = await prisma.user.findFirst({ where: { role: 'manager' } });
        if (!manager) return res.status(400).json({ success: false, message: 'No manager found to assign approval' });
        resolvedApproverId = manager.id;
      }

      const approval = await prisma.approval.create({
        data: {
          quotationId,
          approverId: resolvedApproverId,
          status: 'pending',
        },
        include: {
          quotation: {
            include: {
              vendor: { select: { id: true, name: true } },
              rfq: { select: { id: true, title: true } },
            },
          },
          approver: { select: { id: true, name: true, email: true } },
        },
      });

      // Mark quotation as selected (under review)
      await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'selected' } });

      // Notify the approver
      await prisma.notification.create({
        data: {
          userId: resolvedApproverId,
          title: 'Approval Required',
          message: `A quotation from "${quotation.vendor.name}" for RFQ "${quotation.rfq.title}" requires your approval.`,
        },
      });

      await logActivity(
        req.user!.id,
        'approval',
        approval.id,
        'created',
        `Approval requested for quotation from "${quotation.vendor.name}"`
      );

      return res.status(201).json({ success: true, data: approval });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/approvals/:id
router.get('/:id', requireRole('admin', 'manager', 'procurement_officer'), async (req: AuthRequest, res: Response) => {
  try {
    const approval = await prisma.approval.findUnique({
      where: { id: req.params.id },
      include: {
        quotation: {
          include: {
            vendor: true,
            rfq: { include: { items: true } },
            items: { include: { rfqItem: true } },
          },
        },
        approver: { select: { id: true, name: true, email: true } },
        purchaseOrder: true,
      },
    });

    if (!approval) return res.status(404).json({ success: false, message: 'Approval not found' });
    return res.json({ success: true, data: approval });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/approvals/:id — approve or reject
router.put(
  '/:id',
  requireRole('admin', 'manager'),
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { status, remarks } = req.body;

      const approval = await prisma.approval.findUnique({
        where: { id: req.params.id },
        include: {
          quotation: {
            include: {
              rfq: { include: { createdBy: true } },
              vendor: true,
            },
          },
        },
      });

      if (!approval) return res.status(404).json({ success: false, message: 'Approval not found' });
      if (approval.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'This approval has already been actioned' });
      }

      const updated = await prisma.approval.update({
        where: { id: req.params.id },
        data: { status, remarks: remarks || null },
        include: {
          quotation: { include: { vendor: true, rfq: true } },
          approver: { select: { id: true, name: true } },
        },
      });

      // Update quotation status based on decision
      await prisma.quotation.update({
        where: { id: approval.quotationId },
        data: { status: status === 'approved' ? 'selected' : 'rejected' },
      });

      // Notify the procurement officer who created the RFQ
      const officerId = approval.quotation.rfq.createdById;
      await prisma.notification.create({
        data: {
          userId: officerId,
          title: `Quotation ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `The quotation from "${approval.quotation.vendor.name}" for RFQ "${approval.quotation.rfq.title}" has been ${status}${remarks ? `: ${remarks}` : '.'}`,
        },
      });

      await logActivity(
        req.user!.id,
        'approval',
        approval.id,
        status,
        `Approval ${status} for quotation from "${approval.quotation.vendor.name}"`
      );

      return res.json({ success: true, data: updated, message: `Quotation ${status} successfully` });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
