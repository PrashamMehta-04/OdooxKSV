import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Quotation, RFQ, Vendor, RFQItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getStatusBadge } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const QuotationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const res = await api.get(`/quotations/${id}`);
      if (res.data.success) setQuotation(res.data.data);
    } catch {
      toast.error('Failed to load quotation');
      navigate('/quotations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/quotations/${id}/submit`);
      toast.success('Quotation submitted!');
      fetchQuotation();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  if (!quotation) return null;

  const rfq = typeof quotation.rfqId === 'object' ? quotation.rfqId as RFQ : null;
  const vendor = typeof quotation.vendorId === 'object' ? quotation.vendorId as Vendor : null;

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const canSubmit = user?.role === 'vendor' && quotation.status === 'draft';

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quotation Detail</h1>
            <p className="text-sm text-gray-500">{rfq?.title}</p>
          </div>
        </div>
        {canSubmit && (
          <div className="flex items-center gap-2">
            <Link to={`/quotations/new?editId=${quotation.id}`}>
              <Button variant="outline" size="sm">
                Edit Quotation
              </Button>
            </Link>
            <Button size="sm" leftIcon={<Send size={14} />} isLoading={isSubmitting} onClick={handleSubmit}>
              Submit Quotation
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-gray-500">Status</p>
          <div className="mt-1">{getStatusBadge(quotation.status)}</div>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Vendor</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{vendor?.name || '—'}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-sm font-semibold text-primary-600 mt-1">{formatCurrency(quotation.totalAmount || 0)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Delivery Timeline</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{quotation.deliveryTimeline}</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quoted Items</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Product', 'Qty', 'Unit Price', 'Total', 'Notes'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotation.items.map((item, i) => {
                const rfqItem = typeof item.rfqItemId === 'object' ? item.rfqItemId as RFQItem : null;
                return (
                  <tr key={item.id || i}>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{rfqItem?.productName || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{rfqItem?.quantity} {rfqItem?.unit}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-800">
                      {formatCurrency(item.unitPrice * (rfqItem?.quantity || 1))}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{item.notes || '—'}</td>
                  </tr>
                );
              })}
              <tr className="bg-primary-50">
                <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700">Total:</td>
                <td className="px-4 py-2.5 text-sm font-bold text-primary-700">{formatCurrency(quotation.totalAmount || 0)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {quotation.notes && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600">{quotation.notes}</p>
        </Card>
      )}

      {quotation.submittedAt && (
        <p className="text-xs text-gray-400">Submitted on {formatDate(quotation.submittedAt)}</p>
      )}
    </div>
  );
};

export default QuotationDetail;
