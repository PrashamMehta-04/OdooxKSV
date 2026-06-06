import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { RFQ } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { getStatusBadge } from '../../components/ui/Badge';

const tabs = ['All', 'Draft', 'Sent', 'Closed'] as const;

const RFQList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('All');

  useEffect(() => {
    fetchRFQs();
  }, [activeTab]);

  const fetchRFQs = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeTab !== 'All') params.status = activeTab.toLowerCase();
      const res = await api.get('/rfqs', { params });
      if (res.data.success) setRfqs(res.data.data || []);
    } catch {
      toast.error('Failed to load RFQs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const columns = [
    {
      header: 'Title',
      render: (row: RFQ) => (
        <button
          onClick={() => navigate(`/rfqs/${row.id}`)}
          className="font-medium text-primary-600 hover:underline text-left"
        >
          {row.title}
        </button>
      ),
    },
    {
      header: 'Status',
      render: (row: RFQ) => getStatusBadge(row.status),
    },
    {
      header: 'Deadline',
      render: (row: RFQ) => (
        <span className={new Date(row.deadline) < new Date() && row.status !== 'closed' ? 'text-red-500' : ''}>
          {formatDate(row.deadline)}
        </span>
      ),
    },
    {
      header: 'Items',
      render: (row: RFQ) => `${row.items?.length || 0} item(s)`,
    },
    {
      header: 'Vendors',
      render: (row: RFQ) => `${row.rfqVendors?.length || 0} invited`,
    },
    {
      header: 'Created',
      render: (row: RFQ) => formatDate(row.createdAt),
    },
    {
      header: 'Actions',
      render: (row: RFQ) => (
        <button
          onClick={() => navigate(`/rfqs/${row.id}`)}
          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  const canCreate = user?.role === 'procurement_officer' || user?.role === 'admin';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">RFQs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Request For Quotations</p>
        </div>
        {canCreate && (
          <Button leftIcon={<Plus size={14} />} onClick={() => navigate('/rfqs/new')}>
            Create RFQ
          </Button>
        )}
      </div>

      <Card>
        {/* Tabs */}
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
          data={rfqs}
          isLoading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage="No RFQs found."
        />
      </Card>
    </div>
  );
};

export default RFQList;
