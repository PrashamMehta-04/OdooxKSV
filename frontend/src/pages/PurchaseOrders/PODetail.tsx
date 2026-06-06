import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PurchaseOrder } from '../../types';
import { getPurchaseOrderItems, getPurchaseOrderSubtotal, getPurchaseOrderTax, getPurchaseOrderVendor } from '../../utils/procurement';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getStatusBadge } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const PODetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  useEffect(() => {
    if (id) fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      const res = await api.get(`/purchase-orders/${id}`);
      if (res.data.success) setPO(res.data.data);
    } catch {
      toast.error('Failed to load purchase order');
      navigate('/purchase-orders');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const res = await api.post('/invoices', { purchaseOrderId: id });
      if (res.data.success) {
        toast.success('Invoice generated!');
        navigate(`/invoices/${res.data.data.id}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate invoice';
      toast.error(msg);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  if (!po) return null;

  const vendor = getPurchaseOrderVendor(po);
  const items = getPurchaseOrderItems(po);
  const subtotal = getPurchaseOrderSubtotal(po);
  const tax = getPurchaseOrderTax(po);
  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };
  const canGenerateInvoice = user?.role === 'procurement_officer' || user?.role === 'admin';

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchase-orders')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">{po.poNumber}</h1>
            <p className="text-sm text-gray-500">Purchase Order</p>
          </div>
        </div>
        {canGenerateInvoice && (
          <Button leftIcon={<Receipt size={14} />} isLoading={isGeneratingInvoice} onClick={generateInvoice}>
            Generate Invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><p className="text-xs text-gray-500">Status</p><div className="mt-1">{getStatusBadge(po.status)}</div></Card>
        <Card><p className="text-xs text-gray-500">Vendor</p><p className="text-sm font-semibold text-gray-900 mt-1">{vendor?.name || '—'}</p></Card>
        <Card><p className="text-xs text-gray-500">Created</p><p className="text-sm font-semibold text-gray-900 mt-1">{formatDate(po.createdAt)}</p></Card>
        <Card><p className="text-xs text-gray-500">Total Amount</p><p className="text-sm font-bold text-primary-600 mt-1">{formatCurrency(po.totalAmount)}</p></Card>
      </div>

      {vendor && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendor Details</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{vendor.name}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{vendor.email}</span></div>
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{vendor.phone}</span></div>
            <div><span className="text-gray-500">GST:</span> <span className="font-medium font-mono">{vendor.gstNumber}</span></div>
            <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{vendor.address}</span></div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Product', 'Qty', 'Unit', 'Unit Price', 'Total'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, i) => (
                <tr key={item.id || i}>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{item.productName}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">{item.unit}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 space-y-1 flex flex-col items-end pr-4 pb-2">
            <div className="flex gap-8 text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex gap-8 text-sm text-gray-600">
              <span>Tax (GST)</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex gap-8 text-base font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
              <span>Total</span>
              <span className="text-primary-600">{formatCurrency(po.totalAmount)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PODetail;
