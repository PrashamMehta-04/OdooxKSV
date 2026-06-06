import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin', 'manager', 'procurement_officer'));

// GET /api/reports/vendor-performance
router.get('/vendor-performance', async (req: AuthRequest, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        quotations: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    const performance = vendors.map((vendor) => {
      const totalQuotes = vendor.quotations.length;
      const selectedQuotes = vendor.quotations.filter((q) => q.status === 'selected').length;
      const avgPrice =
        totalQuotes > 0
          ? vendor.quotations.reduce((sum, q) => sum + q.totalAmount, 0) / totalQuotes
          : 0;
      const winRate = totalQuotes > 0 ? (selectedQuotes / totalQuotes) * 100 : 0;

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        category: vendor.category,
        status: vendor.status,
        totalQuotes,
        selectedQuotes,
        avgPrice: parseFloat(avgPrice.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(1)),
      };
    });

    // Sort by win rate desc
    performance.sort((a, b) => b.winRate - a.winRate);

    return res.json({ success: true, data: performance });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/procurement-stats
router.get('/procurement-stats', async (req: AuthRequest, res: Response) => {
  try {
    const [totalRFQs, totalQuotations, totalApprovals, totalPOs, totalInvoices, spendAgg, vendorCount] =
      await Promise.all([
        prisma.rfq.count(),
        prisma.quotation.count(),
        prisma.approval.count(),
        prisma.purchaseOrder.count(),
        prisma.invoice.count(),
        prisma.invoice.aggregate({ _sum: { totalAmount: true } }),
        prisma.vendor.count(),
      ]);

    const rfqByStatus = await prisma.rfq.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const poByStatus = await prisma.purchaseOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const invoiceByStatus = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return res.json({
      success: true,
      data: {
        totalRFQs,
        totalQuotations,
        totalApprovals,
        totalPOs,
        totalInvoices,
        totalSpend: spendAgg._sum.totalAmount ?? 0,
        totalVendors: vendorCount,
        rfqByStatus: rfqByStatus.reduce((acc: any, r) => { acc[r.status] = r._count.id; return acc; }, {}),
        poByStatus: poByStatus.reduce((acc: any, r) => { acc[r.status] = r._count.id; return acc; }, {}),
        invoiceByStatus: invoiceByStatus.reduce((acc: any, r) => { acc[r.status] = r._count.id; return acc; }, {}),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/spending-summary
router.get('/spending-summary', async (req: AuthRequest, res: Response) => {
  try {
    // Get all invoices with vendor category info
    const invoices = await prisma.invoice.findMany({
      include: {
        purchaseOrder: {
          include: {
            approval: {
              include: {
                quotation: {
                  include: {
                    vendor: { select: { id: true, name: true, category: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate by vendor category
    const categoryMap: Record<string, { category: string; totalSpend: number; invoiceCount: number }> = {};
    for (const inv of invoices) {
      const category = inv.purchaseOrder.approval.quotation.vendor.category;
      if (!categoryMap[category]) {
        categoryMap[category] = { category, totalSpend: 0, invoiceCount: 0 };
      }
      categoryMap[category].totalSpend += inv.totalAmount;
      categoryMap[category].invoiceCount += 1;
    }

    const summary = Object.values(categoryMap)
      .map((c) => ({ ...c, totalSpend: parseFloat(c.totalSpend.toFixed(2)) }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    return res.json({ success: true, data: summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/monthly-trends
router.get('/monthly-trends', async (req: AuthRequest, res: Response) => {
  try {
    // Fetch last 12 months of POs and invoices
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setUTCHours(0, 0, 0, 0);
    twelveMonthsAgo.setUTCDate(1);
    twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);

    const [pos, invoices] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true, totalAmount: true },
      }),
    ]);

    // Build month buckets
    const months: Record<string, { month: string; poCount: number; poTotal: number; invoiceCount: number; invoiceTotal: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - i);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: key, poCount: 0, poTotal: 0, invoiceCount: 0, invoiceTotal: 0 };
    }

    for (const po of pos) {
      const d = new Date(po.createdAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].poCount += 1;
        months[key].poTotal += po.totalAmount;
      }
    }

    for (const inv of invoices) {
      const d = new Date(inv.createdAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].invoiceCount += 1;
        months[key].invoiceTotal += inv.totalAmount;
      }
    }

    const trends = Object.values(months).map((m) => ({
      month: m.month,
      purchaseOrders: m.poCount,
      invoices: m.invoiceCount,
      spend: parseFloat(m.invoiceTotal.toFixed(2)),
    }));

    return res.json({ success: true, data: trends });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
