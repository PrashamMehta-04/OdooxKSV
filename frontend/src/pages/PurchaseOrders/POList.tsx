import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PurchaseOrder } from '../../types';
import { getPurchaseOrderItems, getPurchaseOrderSubtotal, getPurchaseOrderTax, getPurchaseOrderVendor } from '../../utils/procurement';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import { getStatusBadge } from '../../components/ui/Badge';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const POList: React.FC = () => {
  const navigate = useNavigate();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/purchase-orders');
      if (res.data.success) setPOs(res.data.data || []);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const columns = [
    {
      header: 'PO Number',
      render: (row: PurchaseOrder) => (
        <button
          onClick={() => navigate(`/purchase-orders/${row.id}`)}
          className="font-medium text-primary-600 hover:underline text-left font-mono"
        >
          {row.poNumber}
        </button>
      ),
    },
    {
      header: 'Vendor',
      render: (row: PurchaseOrder) => {
        const v = getPurchaseOrderVendor(row);
        return <span>{v?.name || '—'}</span>;
      },
    },
    {
      header: 'Items',
      render: (row: PurchaseOrder) => `${getPurchaseOrderItems(row).length} item(s)`,
    },
    {
      header: 'Subtotal',
      render: (row: PurchaseOrder) => formatCurrency(getPurchaseOrderSubtotal(row)),
    },
    {
      header: 'Tax',
      render: (row: PurchaseOrder) => formatCurrency(getPurchaseOrderTax(row)),
    },
    {
      header: 'Total',
      render: (row: PurchaseOrder) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.totalAmount || 0)}</span>
      ),
    },
    {
      header: 'Status',
      render: (row: PurchaseOrder) => getStatusBadge(row.status),
    },
    {
      header: 'Created',
      render: (row: PurchaseOrder) => formatDate(row.createdAt),
    },
    {
      header: 'Actions',
      render: (row: PurchaseOrder) => (
        <button
          onClick={() => navigate(`/purchase-orders/${row.id}`)}
          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">{pos.length} purchase order{pos.length !== 1 ? 's' : ''}</p>
      </div>
      <Card>
        <Table
          columns={columns}
          data={pos}
          isLoading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage="No purchase orders yet."
        />
      </Card>
    </div>
  );
};

export default POList;
