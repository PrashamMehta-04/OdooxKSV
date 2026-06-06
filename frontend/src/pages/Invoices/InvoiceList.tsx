import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Download, Mail } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../../api/axios';
import { Invoice } from '../../types';
import { getInvoiceVendor } from '../../utils/procurement';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import { getStatusBadge } from '../../components/ui/Badge';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/invoices');
      if (res.data.success) setInvoices(res.data.data || []);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = (id: string) => {
    const token = localStorage.getItem('vendorbridge_token');
    window.open(`${API_BASE_URL}/invoices/${id}/pdf?token=${token}`, '_blank');
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const columns = [
    {
      header: 'Invoice #',
      render: (row: Invoice) => (
        <button
          onClick={() => navigate(`/invoices/${row.id}`)}
          className="font-medium text-primary-600 hover:underline text-left font-mono"
        >
          {row.invoiceNumber}
        </button>
      ),
    },
    {
      header: 'Vendor',
      render: (row: Invoice) => {
        const v = getInvoiceVendor(row);
        return <span>{v?.name || '—'}</span>;
      },
    },
    {
      header: 'Total',
      render: (row: Invoice) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.totalAmount || 0)}</span>
      ),
    },
    {
      header: 'Status',
      render: (row: Invoice) => getStatusBadge(row.status),
    },
    {
      header: 'Date',
      render: (row: Invoice) => formatDate(row.createdAt),
    },
    {
      header: 'Actions',
      render: (row: Invoice) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/invoices/${row.id}`)}
            className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50"
            title="View"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => downloadPDF(row.id)}
            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            title="Download PDF"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => navigate(`/invoices/${row.id}`)}
            className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
            title="Send Email"
          >
            <Mail size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
      </div>
      <Card>
        <Table
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage="No invoices yet."
        />
      </Card>
    </div>
  );
};

export default InvoiceList;
