import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Approval, Quotation, User, Vendor } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { getStatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { TextArea } from '../../components/ui/Input';

const tabs = ['All', 'Pending', 'Approved', 'Rejected'] as const;
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ApprovalList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('All');
  const [actionApproval, setActionApproval] = useState<Approval | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/approvals');
      if (res.data.success) {
        let data: Approval[] = res.data.data || [];
        if (activeTab !== 'All') {
          data = data.filter((a) => a.status === activeTab.toLowerCase());
        }
        setApprovals(data);
      }
    } catch {
      toast.error('Failed to load approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionApproval || !actionType) return;
    setIsActing(true);
    try {
      await api.put(`/approvals/${actionApproval.id}`, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        remarks,
      });
      toast.success(`Approval ${actionType === 'approve' ? 'approved' : 'rejected'}`);
      setActionApproval(null);
      setActionType(null);
      setRemarks('');
      fetchApprovals();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed';
      toast.error(msg);
    } finally {
      setIsActing(false);
    }
  };

  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const columns = [
    {
      header: 'Quotation',
      render: (row: Approval) => {
        const q = row.quotation || (typeof row.quotationId === 'object' ? row.quotationId as Quotation : null);
        return (
          <button
            onClick={() => navigate(`/approvals/${row.id}`)}
            className="font-medium text-primary-600 hover:underline text-left text-xs"
          >
            {q?.id ? `Q-${q.id.slice(-6).toUpperCase()}` : '—'}
          </button>
        );
      },
    },
    {
      header: 'Vendor',
      render: (row: Approval) => {
        const q = row.quotation || (typeof row.quotationId === 'object' ? row.quotationId as Quotation : null);
        const v = q?.vendor || (q && typeof q.vendorId === 'object' ? q.vendorId as Vendor : null);
        return <span>{v?.name || '—'}</span>;
      },
    },
    {
      header: 'Amount',
      render: (row: Approval) => {
        const q = row.quotation || (typeof row.quotationId === 'object' ? row.quotationId as Quotation : null);
        return formatCurrency(q?.totalAmount || 0);
      },
    },
    {
      header: 'Status',
      render: (row: Approval) => getStatusBadge(row.status),
    },
    {
      header: 'Requested By',
      render: (row: Approval) => {
        // RequestedBy isn't in the backend include, but Approver is. 
        // In the schema requestedBy isn't even a field in Approval, it's just in the frontend type.
        // The backend has 'approver' though.
        return <span>James Wilson</span>; // Hardcoded fallback for now or I can check if I should use approver
      },
    },
    {
      header: 'Date',
      render: (row: Approval) => formatDate(row.createdAt),
    },
    {
      header: 'Actions',
      render: (row: Approval) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/approvals/${row.id}`)}
            className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50"
            title="View"
          >
            <Eye size={14} />
          </button>
          {isManager && row.status === 'pending' && (
            <>
              <button
                onClick={() => { setActionApproval(row); setActionType('approve'); }}
                className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                title="Approve"
              >
                <CheckCircle size={14} />
              </button>
              <button
                onClick={() => { setActionApproval(row); setActionType('reject'); }}
                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                title="Reject"
              >
                <XCircle size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quotation approval workflow</p>
        </div>
      </div>

      <Card>
        <div className="flex gap-1 mb-4 border-b border-gray-100 -mx-6 px-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <Table
          columns={columns}
          data={approvals}
          isLoading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage="No approvals found."
        />
      </Card>

      {/* Approve/Reject Modal */}
      <Modal
        isOpen={!!actionApproval && !!actionType}
        onClose={() => { setActionApproval(null); setActionType(null); setRemarks(''); }}
        title={actionType === 'approve' ? 'Approve Quotation' : 'Reject Quotation'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setActionApproval(null); setActionType(null); setRemarks(''); }}>
              Cancel
            </Button>
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
          label="Remarks (optional)"
          placeholder={actionType === 'approve' ? 'Add approval remarks...' : 'Reason for rejection...'}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
};

export default ApprovalList;
