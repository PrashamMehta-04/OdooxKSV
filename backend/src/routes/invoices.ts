import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../lib/logger';
import { sendMail } from '../lib/mailer';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  return `INV-${year}-${String(count + 1).padStart(3, '0')}`;
}

// GET /api/invoices
router.get('/', requireRole('admin', 'procurement_officer', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        purchaseOrder: {
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
        },
      },
    });

    return res.json({ success: true, data: invoices });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/invoices
router.post(
  '/',
  requireRole('admin', 'procurement_officer', 'manager'),
  [body('purchaseOrderId').notEmpty().withMessage('Purchase Order ID is required')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { purchaseOrderId } = req.body;

      const po = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { invoice: true },
      });

      if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });
      if (po.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Invoices can only be created for active purchase orders' });
      }
      if (po.invoice) {
        return res.status(409).json({ success: false, message: 'An invoice already exists for this purchase order' });
      }

      const invoiceNumber = await generateInvoiceNumber();

      const invoice = await prisma.invoice.create({
        data: {
          purchaseOrderId,
          invoiceNumber,
          totalAmount: po.totalAmount,
          taxAmount: po.taxAmount,
          status: 'generated',
        },
        include: {
          purchaseOrder: {
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
          },
        },
      });

      await logActivity(
        req.user!.id,
        'invoice',
        invoice.id,
        'created',
        `Invoice ${invoiceNumber} created for PO ${po.poNumber}`
      );

      return res.status(201).json({ success: true, data: invoice });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/invoices/:id
router.get('/:id', requireRole('admin', 'procurement_officer', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrder: {
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
                approver: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    return res.json({ success: true, data: invoice });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', requireRole('admin', 'procurement_officer', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrder: {
          include: {
            approval: {
              include: {
                quotation: {
                  include: {
                    vendor: true,
                    rfq: { select: { id: true, title: true } },
                    items: { include: { rfqItem: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const { purchaseOrder } = invoice;
    const { approval } = purchaseOrder;
    const { quotation } = approval;
    const vendor = quotation.vendor;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(26).font('Helvetica-Bold').fillColor('#1a56db').text('VendorBridge', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
      .text('Procurement & Vendor Management', 50, 82)
      .text('contact@vendorbridge.com  |  www.vendorbridge.com', 50, 96);

    // Invoice label (top right)
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#111827').text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
      .text(`Invoice No: ${invoice.invoiceNumber}`, 400, 80, { align: 'right' })
      .text(`PO Number: ${purchaseOrder.poNumber}`, 400, 94, { align: 'right' })
      .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, 400, 108, { align: 'right' })
      .text(`Status: ${invoice.status.toUpperCase()}`, 400, 122, { align: 'right' });

    doc.moveTo(50, 145).lineTo(545, 145).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // ── Bill To ──────────────────────────────────────────────────────────────
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('BILL TO', 50, 160);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(vendor.name, 50, 174);
    doc.fontSize(10).font('Helvetica').fillColor('#374151')
      .text(`Contact: ${vendor.contactPerson}`, 50, 190)
      .text(`Email: ${vendor.email}`, 50, 204)
      .text(`Phone: ${vendor.phone}`, 50, 218);
    if (vendor.gstNumber) {
      doc.text(`GST: ${vendor.gstNumber}`, 50, 232);
    }
    if (vendor.address) {
      doc.text(`Address: ${vendor.address}`, 50, vendor.gstNumber ? 246 : 232);
    }

    // RFQ reference
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('RFQ REFERENCE', 350, 160);
    doc.fontSize(10).font('Helvetica').fillColor('#374151')
      .text(quotation.rfq.title, 350, 174)
      .text(`Delivery: ${quotation.deliveryTimeline}`, 350, 188);

    const tableTop = 290;
    doc.moveTo(50, tableTop - 10).lineTo(545, tableTop - 10).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // ── Table Header ──────────────────────────────────────────────────────────
    doc.rect(50, tableTop - 8, 495, 22).fill('#1a56db');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('#', 55, tableTop, { width: 20 });
    doc.text('Product / Description', 80, tableTop, { width: 220 });
    doc.text('Qty', 305, tableTop, { width: 50, align: 'right' });
    doc.text('Unit Price', 360, tableTop, { width: 80, align: 'right' });
    doc.text('Total', 445, tableTop, { width: 95, align: 'right' });

    // ── Table Rows ────────────────────────────────────────────────────────────
    let y = tableTop + 28;
    quotation.items.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(50, y - 5, 495, 20).fill(bg);

      doc.fontSize(9).font('Helvetica').fillColor('#374151');
      doc.text(String(idx + 1), 55, y, { width: 20 });
      doc.text(item.rfqItem.productName, 80, y, { width: 220 });
      doc.text(`${item.rfqItem.quantity} ${item.rfqItem.unit}`, 305, y, { width: 50, align: 'right' });
      doc.text(`₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 360, y, { width: 80, align: 'right' });
      doc.text(`₹${item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 445, y, { width: 95, align: 'right' });
      y += 20;
    });

    doc.moveTo(50, y + 5).lineTo(545, y + 5).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // ── Totals ────────────────────────────────────────────────────────────────
    y += 18;
    const subtotal = quotation.totalAmount;
    const taxAmt = invoice.taxAmount;
    const total = invoice.totalAmount;

    doc.fontSize(10).font('Helvetica').fillColor('#374151');
    doc.text('Subtotal:', 360, y, { width: 80, align: 'right' });
    doc.text(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 445, y, { width: 95, align: 'right' });
    y += 18;

    doc.text(`Tax (${purchaseOrder.taxRate}%):`, 360, y, { width: 80, align: 'right' });
    doc.text(`₹${taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 445, y, { width: 95, align: 'right' });
    y += 18;

    doc.rect(355, y - 4, 190, 24).fill('#1a56db');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('TOTAL:', 360, y + 2, { width: 80, align: 'right' });
    doc.text(`₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 445, y + 2, { width: 95, align: 'right' });

    // ── Footer ────────────────────────────────────────────────────────────────
    y += 50;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.fontSize(9).font('Helvetica').fillColor('#9ca3af')
      .text('Thank you for your business. This is a system-generated invoice from VendorBridge.', 50, y + 10, {
        align: 'center',
        width: 495,
      });

    doc.end();
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/invoices/:id/send-email
router.post('/:id/send-email', requireRole('admin', 'procurement_officer', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrder: {
          include: {
            approval: {
              include: {
                quotation: {
                  include: { vendor: true, rfq: { select: { title: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const vendor = invoice.purchaseOrder.approval.quotation.vendor;
    const rfqTitle = invoice.purchaseOrder.approval.quotation.rfq.title;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a56db; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">VendorBridge</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0;">Procurement & Vendor Management</p>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827;">Invoice ${invoice.invoiceNumber}</h2>
          <p>Dear <strong>${vendor.contactPerson}</strong>,</p>
          <p>Please find the details of your invoice for <strong>${rfqTitle}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #e5e7eb;">
              <td style="padding: 8px; font-weight: bold;">Invoice Number</td>
              <td style="padding: 8px;">${invoice.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">PO Number</td>
              <td style="padding: 8px;">${invoice.purchaseOrder.poNumber}</td>
            </tr>
            <tr style="background: #e5e7eb;">
              <td style="padding: 8px; font-weight: bold;">Amount</td>
              <td style="padding: 8px;">₹${invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Tax Amount</td>
              <td style="padding: 8px;">₹${invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style="background: #e5e7eb;">
              <td style="padding: 8px; font-weight: bold;">Status</td>
              <td style="padding: 8px;">${invoice.status.toUpperCase()}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 12px;">This is a system-generated email from VendorBridge ERP.</p>
        </div>
      </div>
    `;

    await sendMail(vendor.email, `Invoice ${invoice.invoiceNumber} from VendorBridge`, html);

    // Update invoice status to sent
    await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'sent' } });

    await logActivity(req.user!.id, 'invoice', invoice.id, 'email_sent', `Invoice ${invoice.invoiceNumber} sent to ${vendor.email}`);

    return res.json({ success: true, message: `Invoice emailed to ${vendor.email}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
