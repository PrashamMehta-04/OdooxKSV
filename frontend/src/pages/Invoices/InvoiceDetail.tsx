import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Mail, Printer, Zap } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../../api/axios';
import { Invoice } from '../../types';
import { getInvoiceItems, getInvoicePurchaseOrder, getInvoiceSubtotal, getInvoiceTax, getInvoiceVendor } from '../../utils/procurement';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getStatusBadge } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data.success) {
        setInvoice(res.data.data);
        const v = getInvoiceVendor(res.data.data);
        if (v?.email) setEmailAddress(v.email);
      }
    } catch {
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = () => {
    const token = localStorage.getItem('vendorbridge_token');
    window.open(`${API_BASE_URL}/invoices/${id}/pdf?token=${token}`, '_blank');
  };

  const sendEmail = async () => {
    if (!emailAddress) { toast.error('Please enter an email address'); return; }
    setIsSendingEmail(true);
    try {
      await api.post(`/invoices/${id}/send-email`, { email: emailAddress });
      toast.success('Invoice sent via email!');
      setShowEmailModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send email';
      toast.error(msg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  if (!invoice) return null;

  const vendor = getInvoiceVendor(invoice);
  const po = getInvoicePurchaseOrder(invoice);
  const items = getInvoiceItems(invoice);
  const subtotal = getInvoiceSubtotal(invoice);
  const tax = getInvoiceTax(invoice);
  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  return (
    <div className="max-w-3xl space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-gray-500">Invoice</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Printer size={13} />} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Download size={13} />} onClick={downloadPDF}>
            Download PDF
          </Button>
          <Button size="sm" leftIcon={<Mail size={13} />} onClick={() => setShowEmailModal(true)}>
            Send via Email
          </Button>
        </div>
      </div>

      {/* Invoice Preview */}
      <div id="invoice-print" className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">VendorBridge</span>
            </div>
            <p className="text-xs text-gray-500">Procurement & Vendor Management</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Invoice</h2>
            <p className="font-mono text-sm text-gray-600 mt-1">{invoice.invoiceNumber}</p>
            <div className="mt-2">{getStatusBadge(invoice.status)}</div>
          </div>
        </div>

        {/* Dates and PO Ref */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bill To</p>
            {vendor ? (
              <div className="text-sm space-y-0.5">
                <p className="font-semibold text-gray-900">{vendor.name}</p>
                <p className="text-gray-600">{vendor.contactPerson}</p>
                <p className="text-gray-600">{vendor.email}</p>
                <p className="text-gray-600">{vendor.phone}</p>
                <p className="text-gray-600">{vendor.address}</p>
                <p className="font-mono text-gray-500">GST: {vendor.gstNumber}</p>
              </div>
            ) : <p className="text-sm text-gray-500">—</p>}
          </div>
          <div className="text-right space-y-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Invoice Date</p>
              <p className="text-sm text-gray-800">{formatDate(invoice.createdAt)}</p>
            </div>
            {po && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">PO Reference</p>
                <p className="text-sm font-mono text-gray-800">{po.poNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase">Description</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase">Qty</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase">Unit</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase">Unit Price</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={item.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 text-sm text-gray-800">{item.productName}</td>
                  <td className="px-4 py-2.5 text-sm text-center text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-sm text-center text-gray-600">{item.unit}</td>
                  <td className="px-4 py-2.5 text-sm text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-800">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>GST / Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2">
              <span>Total Due</span>
              <span className="text-primary-600">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          Thank you for your business • VendorBridge Procurement Platform
        </div>
      </div>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Send Invoice via Email"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEmailModal(false)}>Cancel</Button>
            <Button isLoading={isSendingEmail} onClick={sendEmail} leftIcon={<Mail size={13} />}>
              Send
            </Button>
          </>
        }
      >
        <Input
          label="Email Address"
          type="email"
          placeholder="vendor@company.com"
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default InvoiceDetail;
