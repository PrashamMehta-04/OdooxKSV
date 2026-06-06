import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, BarChart2, Calendar, Package, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { RFQ, Vendor } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getStatusBadge } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const RFQDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (id) fetchRFQ();
  }, [id]);

  const fetchRFQ = async () => {
    try {
      const res = await api.get(`/rfqs/${id}`);
      if (res.data.success) setRfq(res.data.data);
    } catch {
      toast.error('Failed to load RFQ');
      navigate('/rfqs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      await api.post(`/rfqs/${id}/send`);
      toast.success('RFQ sent to vendors!');
      fetchRFQ();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send RFQ';
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  if (!rfq) return null;

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const canSend = (user?.role === 'procurement_officer' || user?.role === 'admin') && rfq.status === 'draft';

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/rfqs')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{rfq.title}</h1>
            <p className="text-sm text-gray-500">RFQ Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rfq.status === 'sent' && (
            <Link to={`/quotations/compare/${rfq.id}`}>
              <Button variant="outline" leftIcon={<BarChart2 size={14} />}>
                View Quotations
              </Button>
            </Link>
          )}
          {canSend && (
            <>
              <Link to={`/rfqs/new?editId=${rfq.id}`}>
                <Button variant="outline" size="sm">
                  Edit RFQ
                </Button>
              </Link>
              <Button size="sm" leftIcon={<Send size={14} />} isLoading={isSending} onClick={handleSend}>
                Send RFQ
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Calendar size={14} />
            <span className="text-xs font-medium">Deadline</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{formatDate(rfq.deadline)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Package size={14} />
            <span className="text-xs font-medium">Items</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{rfq.items.length} item(s)</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <span className="text-xs font-medium">Status</span>
          </div>
          {getStatusBadge(rfq.status)}
        </Card>
      </div>

      {/* Description & Attachments */}
      {(rfq.description || rfq.attachmentUrl) && (
        <Card>
          {rfq.description && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600">{rfq.description}</p>
            </div>
          )}
          {rfq.attachmentUrl && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Attachments</h3>
              <a
                href={rfq.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline"
              >
                <ExternalLink size={14} /> View Supporting Documents
              </a>
            </div>
          )}
        </Card>
      )}

      {/* Items */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Items Required</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Product Name', 'Quantity', 'Unit', 'Description'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rfq.items.map((item, i) => (
                <tr key={item.id || i}>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{item.productName}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">{item.unit}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{item.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invited Vendors */}
      {rfq.rfqVendors && rfq.rfqVendors.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Invited Vendors</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {rfq.rfqVendors.map((rv, i) => {
              const vendor = rv.vendor;
              return (
                <div key={rv.id || i} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-800">{vendor?.name || '—'}</p>
                  {vendor?.category && <p className="text-xs text-gray-500">{vendor.category}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RFQDetail;