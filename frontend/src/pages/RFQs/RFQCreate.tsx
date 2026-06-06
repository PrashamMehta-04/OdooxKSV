import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Send, Save } from 'lucide-react';
import api from '../../api/axios';
import { Vendor } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { TextArea } from '../../components/ui/Input';

const itemSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional().default(''),
});

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  deadline: z.string().min(1, 'Deadline is required'),
  attachmentUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
  vendorIds: z.array(z.string()).optional().default([]),
});

type FormData = z.infer<typeof schema>;

const RFQCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: [{ productName: '', quantity: 1, unit: 'pcs', description: '' }],
      vendorIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    api.get('/vendors', { params: { status: 'active' } }).then((res) => {
      if (res.data.success) setVendors(res.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (editId) {
      api.get(`/rfqs/${editId}`).then((res) => {
        if (res.data.success) {
          const rfq = res.data.data;
          let deadlineStr = '';
          try {
            deadlineStr = new Date(rfq.deadline).toISOString().split('T')[0];
          } catch (e) {
            deadlineStr = rfq.deadline;
          }

          reset({
            title: rfq.title,
            description: rfq.description || '',
            deadline: deadlineStr,
            attachmentUrl: rfq.attachmentUrl || '',
            items: rfq.items.map((it: any) => ({
              productName: it.productName,
              quantity: it.quantity,
              unit: it.unit,
              description: it.description || '',
            })),
          });

          const vendorsSet = new Set<string>();
          if (rfq.rfqVendors) {
            rfq.rfqVendors.forEach((rv: any) => {
              vendorsSet.add(rv.vendorId);
            });
          }
          setSelectedVendors(vendorsSet);
        }
      }).catch(() => {
        toast.error('Failed to load RFQ for editing');
      });
    }
  }, [editId, reset]);

  const toggleVendor = (id: string) => {
    setSelectedVendors((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const saveRFQ = async (data: FormData, sendNow: boolean) => {
    try {
      const body = {
        ...data,
        vendorIds: Array.from(selectedVendors),
      };
      
      const res = editId
        ? await api.put(`/rfqs/${editId}`, body)
        : await api.post('/rfqs', body);

      if (res.data.success) {
        const rfqId = editId || res.data.data.id;
        if (sendNow) {
          setIsSending(true);
          try {
            await api.post(`/rfqs/${rfqId}/send`);
            toast.success(editId ? 'RFQ updated and sent!' : 'RFQ created and sent to vendors!');
          } catch {
            toast.success(editId ? 'RFQ updated. Failed to send.' : 'RFQ created. Failed to send.');
          } finally {
            setIsSending(false);
          }
        } else {
          toast.success(editId ? 'RFQ updated successfully' : 'RFQ saved as draft');
        }
        navigate(`/rfqs/${rfqId}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save RFQ';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/rfqs')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{editId ? 'Edit RFQ' : 'Create RFQ'}</h1>
          <p className="text-sm text-gray-500">Request For Quotation</p>
        </div>
      </div>

      <form className="space-y-5">
        {/* Basic Info */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">RFQ Details</h3>
          <div className="space-y-4">
            <Input
              label="RFQ Title *"
              placeholder="Office Furniture Procurement Q1 2024"
              error={errors.title?.message}
              {...register('title')}
            />
            <TextArea
              label="Description"
              placeholder="Describe the procurement need..."
              {...register('description')}
            />
            <Input
              label="Deadline *"
              type="date"
              error={errors.deadline?.message}
              {...register('deadline')}
            />
            <Input
              label="Attachment Link (e.g. Google Drive, Dropbox)"
              placeholder="https://drive.google.com/..."
              error={errors.attachmentUrl?.message}
              {...register('attachmentUrl')}
            />
          </div>
        </Card>

        {/* Items */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus size={13} />}
              onClick={() => append({ productName: '', quantity: 1, unit: 'pcs', description: '' })}
            >
              Add Item
            </Button>
          </div>
          {errors.items?.root && (
            <p className="text-xs text-red-500 mb-2">{errors.items.root.message}</p>
          )}
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-gray-50 rounded-lg p-3">
                <div className="col-span-4">
                  <Input
                    label="Product Name *"
                    placeholder="Ergonomic Chair"
                    error={errors.items?.[index]?.productName?.message}
                    {...register(`items.${index}.productName`)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Qty *"
                    type="number"
                    min="1"
                    error={errors.items?.[index]?.quantity?.message}
                    {...register(`items.${index}.quantity`)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Unit *"
                    placeholder="pcs"
                    error={errors.items?.[index]?.unit?.message}
                    {...register(`items.${index}.unit`)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    label="Description"
                    placeholder="Optional notes"
                    {...register(`items.${index}.description`)}
                  />
                </div>
                <div className="col-span-1 flex justify-center pb-1">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Vendor selection */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Select Vendors</h3>
          <p className="text-xs text-gray-500 mb-4">Choose vendors to invite for quotations</p>
          {vendors.length === 0 ? (
            <p className="text-sm text-gray-500">No active vendors found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {vendors.map((v) => (
                <label
                  key={v.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedVendors.has(v.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedVendors.has(v.id)}
                    onChange={() => toggleVendor(v.id)}
                    className="text-primary-500 rounded"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{v.name}</p>
                    <p className="text-xs text-gray-500 truncate">{v.category}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/rfqs')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            leftIcon={<Save size={14} />}
            isLoading={isSubmitting && !isSending}
            onClick={handleSubmit((d) => saveRFQ(d, false))}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            leftIcon={<Send size={14} />}
            isLoading={isSending || isSubmitting}
            onClick={handleSubmit((d) => saveRFQ(d, true))}
          >
            Create & Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RFQCreate;
