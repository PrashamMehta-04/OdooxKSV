import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Approval, Quotation, Vendor, User, RFQItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getStatusBadge } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { TextArea } from '../../components/ui/Input';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ApprovalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [isActing, setIsActing] = useState(false);
  const [isGeneratingPO, setIsGeneratingPO] = useState(false);

  useEffect(() => {
    if (id) fetchApproval();
  }, [id]);

  const fetchApproval = async () => {
    try {
      const res = await api.get(`/approvals/${id}`);
      if (res.data.success) setApproval(res.data.data);
    } catch {
      toast.error('Failed to load approval');
      navigate('/approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async () => {
    setIsActing(true);
    try {
      await api.put(`/approvals/${id}`, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        remarks,
      });
      toast.success(`Approval ${actionType === 'approve' ? 'approved' : 'rejected'}`);
      setShowActionModal(false);
      setRemarks('');
      fetchApproval();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed';
      toast.error(msg);
    } finally {
      setIsActing(false);
    }
  };

  const generatePO = async () => {
    setIsGeneratingPO(true);
    try {
      const res = await api.post('/purchase-orders', { approvalId: id });
      if (res.data.success) {
        toast.success('Purchase Order generated!');
        navigate(`/purchase-orders/${res.data.data.id}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate PO';
      toast.error(msg);
    } finally {
      setIsGeneratingPO(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  if (!approval) return null;

  const q = approval.quotation || (typeof approval.quotationId === 'object' ? approval.quotationId as Quotation : null);
  const vendor = q?.vendor || (q && typeof q.vendorId === 'object' ? q.vendorId as Vendor : null);
  const requestedBy = approval.approver || (typeof approval.requestedBy === 'object' ? approval.requestedBy as User : null);
  const approvedBy = approval.approver || (approval.approvedBy && typeof approval.approvedBy === 'object' ? approval.approvedBy as User : null);

  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const canGeneratePO = (user?.role === 'procurement_officer' || user?.role === 'admin') && approval.status === 'approved';

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy h:mm a'); } catch { return d; }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/approvals')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Approval Detail</h1>
            <p className="text-sm text-gray-500">ID: {id?.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && approval.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<XCircle size={14} />}
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => { setActionType('reject'); setShowActionModal(true); }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                leftIcon={<CheckCircle size={14} />}
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { setActionType('approve'); setShowActionModal(true); }}
              >
                Approve
              </Button>
            </>
          )}
          {canGeneratePO && (
            <Button
              leftIcon={<ShoppingCart size={14} />}
              isLoading={isGeneratingPO}
              onClick={generatePO}
            >
              Generate PO
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><p className="text-xs text-gray-500">Status</p><div className="mt-1">{getStatusBadge(approval.status)}</div></Card>
        <Card><p className="text-xs text-gray-500">Vendor</p><p className="text-sm font-semibold text-gray-900 mt-1">{vendor?.name || '—'}</p></Card>
        <Card><p className="text-xs text-gray-500">Total Amount</p><p className="text-sm font-bold text-primary-600 mt-1">{formatCurrency(q?.totalAmount || 0)}</p></Card>
        <Card><p className="text-xs text-gray-500">Requested By</p><p className="text-sm font-semibold text-gray-900 mt-1">{requestedBy?.name || '—'}</p></Card>
      </div>

      {/* Timeline */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Workflow Timeline</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-800">Approval Requested</p>
              <p className="text-xs text-gray-500">{formatDate(approval.createdAt)} by {requestedBy?.name}</p>
            </div>
          </div>
          {approval.status !== 'pending' && (
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${approval.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-xs font-medium text-gray-800">
                  {approval.status === 'approved' ? 'Approved' : 'Rejected'}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(approval.updatedAt)} {approvedBy && `by ${approvedBy.name}`}
                </p>
                {approval.remarks && <p className="text-xs text-gray-600 mt-0.5 italic">"{approval.remarks}"</p>}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quotation Items */}
      {q && q.items && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quotation Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Product', 'Qty', 'Unit Price', 'Total'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {q.items.map((item, i) => {
                  const rfqItem = typeof item.rfqItemId === 'object' ? item.rfqItemId as RFQItem : null;
                  return (
                    <tr key={item.id || i}>
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{rfqItem?.productName || `Item ${i + 1}`}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{rfqItem?.quantity} {rfqItem?.unit}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-700">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{formatCurrency(item.unitPrice * (rfqItem?.quantity || 1))}</td>
                    </tr>
                  );
                })}
                <tr className="bg-primary-50">
                  <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700">Total:</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-primary-700">{formatCurrency(q.totalAmount || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => { setShowActionModal(false); setRemarks(''); }}
        title={actionType === 'approve' ? 'Approve' : 'Reject'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowActionModal(false); setRemarks(''); }}>Cancel</Button>
            <Button
              variant={actionType === 'approve' ? 'primary' : 'danger'}
              isLoading={isActing}
              onClick={handleAction}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <TextArea
          label="Remarks"
          placeholder={actionType === 'approve' ? 'Optional approval note...' : 'Reason for rejection...'}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
};

export default ApprovalDetail;
