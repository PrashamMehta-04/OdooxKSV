import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Quotation, RFQ, Vendor } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { getStatusBadge } from '../../components/ui/Badge';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const QuotationList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/quotations');
      if (res.data.success) setQuotations(res.data.data || []);
    } catch {
      toast.error('Failed to load quotations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const columns = [
    {
      header: 'RFQ Title',
      render: (row: Quotation) => {
        const rfq = typeof row.rfqId === 'object' ? row.rfqId as RFQ : null;
        return (
          <button
            onClick={() => navigate(`/quotations/${row.id}`)}
            className="font-medium text-primary-600 hover:underline text-left"
          >
            {rfq?.title || 'N/A'}
          </button>
        );
      },
    },
    {
      header: 'Vendor',
      render: (row: Quotation) => {
        const v = typeof row.vendorId === 'object' ? row.vendorId as Vendor : null;
        return <span>{v?.name || '—'}</span>;
      },
    },
    {
      header: 'Total Amount',
      render: (row: Quotation) => formatCurrency(row.totalAmount || 0),
    },
    {
      header: 'Delivery Timeline',
      accessor: 'deliveryTimeline' as keyof Quotation,
    },
    {
      header: 'Status',
      render: (row: Quotation) => getStatusBadge(row.status),
    },
    {
      header: 'Submitted',
      render: (row: Quotation) => row.submittedAt ? formatDate(row.submittedAt) : '—',
    },
    {
      header: 'Actions',
      render: (row: Quotation) => (
        <button
          onClick={() => navigate(`/quotations/${row.id}`)}
          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  const isVendor = user?.role === 'vendor';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</p>
        </div>
        {isVendor && (
          <Button leftIcon={<Plus size={14} />} onClick={() => navigate('/quotations/new')}>
            New Quotation
          </Button>
        )}
      </div>
      <Card>
        <Table
          columns={columns}
          data={quotations}
          isLoading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage="No quotations found."
        />
      </Card>
    </div>
  );
};

export default QuotationList;
