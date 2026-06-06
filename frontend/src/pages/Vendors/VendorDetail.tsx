import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Hash, User, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../api/axios';
import { Vendor } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getStatusBadge } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import VendorForm from './VendorForm';

const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (id) fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
      const res = await api.get(`/vendors/${id}`);
      if (res.data.success) setVendor(res.data.data);
    } catch {
      toast.error('Failed to load vendor');
      navigate('/vendors');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  if (!vendor) return null;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
            <p className="text-sm text-gray-500">Vendor Profile</p>
          </div>
        </div>
        <Button leftIcon={<Pencil size={14} />} onClick={() => setShowEdit(true)}>
          Edit Vendor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-3">
            <InfoRow icon={<Mail size={14} />} label="Email" value={vendor.email} />
            <InfoRow icon={<Phone size={14} />} label="Phone" value={vendor.phone} />
            <InfoRow icon={<User size={14} />} label="Contact Person" value={vendor.contactPerson} />
            <InfoRow icon={<MapPin size={14} />} label="Address" value={vendor.address} />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Details</h3>
          <div className="space-y-3">
            <InfoRow icon={<Tag size={14} />} label="Category" value={vendor.category} />
            <InfoRow icon={<Hash size={14} />} label="GST Number" value={vendor.gstNumber} />
            <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Status</span>
              {getStatusBadge(vendor.status)}
            </div>
            <InfoRow
              icon={<Hash size={14} />}
              label="Created"
              value={format(new Date(vendor.createdAt), 'MMM d, yyyy')}
            />
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Vendor"
        size="xl"
      >
        <VendorForm
          vendor={vendor}
          onSuccess={() => { setShowEdit(false); fetchVendor(); }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-gray-400 mt-0.5">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
    </div>
  </div>
);

export default VendorDetail;
