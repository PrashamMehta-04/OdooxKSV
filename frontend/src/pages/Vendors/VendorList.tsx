import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Vendor } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import { getStatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import VendorForm from './VendorForm';

const VendorList: React.FC = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, [search, category, status]);

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (status) params.status = status;
      const res = await api.get('/vendors', { params });
      if (res.data.success) {
        setVendors(res.data.data || []);
      }
    } catch {
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/vendors/${deleteId}`);
      toast.success('Vendor deleted');
      setDeleteId(null);
      fetchVendors();
    } catch {
      toast.error('Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Name',
      render: (row: Vendor) => (
        <button
          onClick={() => navigate(`/vendors/${row.id}`)}
          className="font-medium text-primary-600 hover:underline text-left"
        >
          {row.name}
        </button>
      ),
    },
    { header: 'Category', accessor: 'category' as keyof Vendor },
    {
      header: 'Status',
      render: (row: Vendor) => getStatusBadge(row.status),
    },
    { header: 'Contact Person', accessor: 'contactPerson' as keyof Vendor },
    { header: 'GST Number', accessor: 'gstNumber' as keyof Vendor },
    { header: 'Email', accessor: 'email' as keyof Vendor },
    { header: 'Phone', accessor: 'phone' as keyof Vendor },
    {
      header: 'Actions',
      render: (row: Vendor) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/vendors/${row.id}`)}
            className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="View"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => { setEditVendor(row); setShowForm(true); }}
            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const categories = ['IT', 'Manufacturing', 'Logistics', 'Office Supplies', 'Services', 'Other'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} found</p>
        </div>
        <Button
          leftIcon={<Plus size={14} />}
          onClick={() => { setEditVendor(null); setShowForm(true); }}
        >
          Add Vendor
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-48">
            <Input
              placeholder="Search by name, email..."
              leftIcon={<Search size={14} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <Table
          columns={columns}
          data={vendors}
          isLoading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage="No vendors found. Add your first vendor to get started."
        />
      </Card>

      {/* Vendor Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditVendor(null); }}
        title={editVendor ? 'Edit Vendor' : 'Add Vendor'}
        size="xl"
      >
        <VendorForm
          vendor={editVendor}
          onSuccess={() => { setShowForm(false); setEditVendor(null); fetchVendors(); }}
          onCancel={() => { setShowForm(false); setEditVendor(null); }}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Vendor"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Are you sure you want to delete this vendor? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default VendorList;
