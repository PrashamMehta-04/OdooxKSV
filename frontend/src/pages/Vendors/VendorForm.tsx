import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Vendor } from '../../types';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  gstNumber: z.string().min(1, 'GST number is required'),
  category: z.string().min(1, 'Category is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['active', 'inactive', 'blacklisted']),
});

type FormData = z.infer<typeof schema>;

interface VendorFormProps {
  vendor?: Vendor | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const VendorForm: React.FC<VendorFormProps> = ({ vendor, onSuccess, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: vendor
      ? {
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          gstNumber: vendor.gstNumber || '',
          category: vendor.category,
          contactPerson: vendor.contactPerson,
          address: vendor.address || '',
          status: vendor.status,
        }
      : { status: 'active' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (vendor) {
        await api.put(`/vendors/${vendor.id}`, data);
        toast.success('Vendor updated successfully');
      } else {
        await api.post('/vendors', data);
        toast.success('Vendor created successfully');
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Operation failed';
      toast.error(msg);
    }
  };

  const categories = ['IT', 'Manufacturing', 'Logistics', 'Office Supplies', 'Services', 'Other'];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Vendor Name *"
          placeholder="Tech Supplies Pvt. Ltd."
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Email *"
          type="email"
          placeholder="vendor@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Phone *"
          placeholder="+91 9876543210"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="GST Number *"
          placeholder="22AAAAA0000A1Z5"
          error={errors.gstNumber?.message}
          {...register('gstNumber')}
        />
        <Select
          label="Category *"
          options={categories.map((c) => ({ value: c, label: c }))}
          placeholder="Select category"
          error={errors.category?.message}
          {...register('category')}
        />
        <Input
          label="Contact Person *"
          placeholder="John Doe"
          error={errors.contactPerson?.message}
          {...register('contactPerson')}
        />
        <Select
          label="Status *"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'blacklisted', label: 'Blacklisted' },
          ]}
          error={errors.status?.message}
          {...register('status')}
        />
      </div>
      <Input
        label="Address *"
        placeholder="123 Business Park, Mumbai, India"
        error={errors.address?.message}
        {...register('address')}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {vendor ? 'Update Vendor' : 'Create Vendor'}
        </Button>
      </div>
    </form>
  );
};

export default VendorForm;
