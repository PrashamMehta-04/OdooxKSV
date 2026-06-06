import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/dashboard
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    // Run core counts in parallel
    const [
      pendingApprovals,
      activeRFQs,
      totalVendors,
      totalPOs,
      totalInvoices,
      recentPOs,
      recentInvoices,
    ] = await Promise.all([
      prisma.approval.count({ where: { status: 'pending' } }),
      prisma.rfq.count({ where: { status: 'sent' } }),
      prisma.vendor.count({ where: { status: 'active' } }),
      prisma.purchaseOrder.count(),
      prisma.invoice.count(),
      prisma.purchaseOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          approval: {
            include: {
              quotation: {
                include: {
                  vendor: { select: { id: true, name: true } },
                  rfq: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
      }),
      prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          purchaseOrder: {
            include: {
              approval: {
                include: {
                  quotation: {
                    include: {
                      vendor: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Total spend from paid/active invoices
    const spendAgg = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ['sent', 'paid'] } },
    });
    const totalSpend = spendAgg._sum.totalAmount ?? 0;

    // Draft RFQs and submitted quotations counts
    const [draftRFQs, submittedQuotations] = await Promise.all([
      prisma.rfq.count({ where: { status: 'draft' } }),
      prisma.quotation.count({ where: { status: 'submitted' } }),
    ]);

    const analyticsCards = [
      { label: 'Active RFQs', value: activeRFQs, icon: 'rfq', color: 'blue' },
      { label: 'Draft RFQs', value: draftRFQs, icon: 'draft', color: 'gray' },
      { label: 'Pending Approvals', value: pendingApprovals, icon: 'approval', color: 'orange' },
      { label: 'Submitted Quotations', value: submittedQuotations, icon: 'quotation', color: 'purple' },
      { label: 'Active Vendors', value: totalVendors, icon: 'vendor', color: 'green' },
      { label: 'Total POs', value: totalPOs, icon: 'po', color: 'indigo' },
      { label: 'Total Invoices', value: totalInvoices, icon: 'invoice', color: 'teal' },
      { label: 'Total Spend', value: totalSpend, icon: 'spend', color: 'red', isCurrency: true },
    ];

    return res.json({
      success: true,
      data: {
        pendingApprovals,
        activeRFQs,
        totalVendors,
        totalPOs,
        totalInvoices,
        totalSpend,
        recentPOs,
        recentInvoices,
        analyticsCards,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
