import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Save, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { RFQ } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { TextArea } from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Select from '../../components/ui/Select';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const QuotationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const rfqId = searchParams.get('rfqId');

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState(rfqId || '');
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [deliveryTimeline, setDeliveryTimeline] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch available (sent) RFQs for vendor
    api.get('/rfqs', { params: { status: 'sent' } }).then((res) => {
      if (res.data.success) setRfqs(res.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (editId) {
      setIsLoading(true);
      api.get(`/quotations/${editId}`).then((res) => {
        if (res.data.success) {
          const quot = res.data.data;
          setDeliveryTimeline(quot.deliveryTimeline);
          setNotes(quot.notes || '');
          setSelectedRfqId(quot.rfqId);
          setRfq(quot.rfq);
          
          const p: Record<string, number> = {};
          const n: Record<string, string> = {};
          quot.items.forEach((item: any) => {
            p[item.rfqItemId] = item.unitPrice;
            n[item.rfqItemId] = item.notes || '';
          });
          setPrices(p);
          setItemNotes(n);
        }
      }).catch(() => {
        toast.error('Failed to load quotation for editing');
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [editId]);

  useEffect(() => {
    if (selectedRfqId && !editId) loadRFQ(selectedRfqId);
  }, [selectedRfqId, editId]);

  const loadRFQ = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/rfqs/${id}`);
      if (res.data.success) {
        setRfq(res.data.data);
        // Initialize prices
        const p: Record<string, number> = {};
        const n: Record<string, string> = {};
        res.data.data.items.forEach((item: { id?: string }) => {
          if (item.id) { p[item.id] = 0; n[item.id] = ''; }
        });
        setPrices(p);
        setItemNotes(n);
      }
    } catch {
      toast.error('Failed to load RFQ');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = rfq
    ? rfq.items.reduce((sum, item) => {
        const price = prices[item.id || ''] || 0;
        return sum + price * item.quantity;
      }, 0)
    : 0;

  const buildBody = () => ({
    rfqId: selectedRfqId,
    vendorId: user?.vendorId,
    deliveryTimeline,
    notes,
    items: rfq?.items.map((item) => {
      const unitPrice = prices[item.id || ''] || 0;
      return {
        rfqItemId: item.id,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        notes: itemNotes[item.id || ''] || '',
      };
    }) || [],
  });

  const handleSave = async () => {
    if (!selectedRfqId || !rfq) { toast.error('Please select an RFQ'); return; }
    if (!deliveryTimeline) { toast.error('Please enter delivery timeline'); return; }
    setIsSaving(true);
    try {
      const res = editId
        ? await api.put(`/quotations/${editId}`, buildBody())
        : await api.post('/quotations', buildBody());
      if (res.data.success) {
        toast.success(editId ? 'Quotation updated successfully' : 'Quotation saved as draft');
        navigate(`/quotations/${editId || res.data.data.id}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRfqId || !rfq) { toast.error('Please select an RFQ'); return; }
    if (!deliveryTimeline) { toast.error('Please enter delivery timeline'); return; }
    setIsSubmitting(true);
    try {
      const body = buildBody();
      const res = editId
        ? await api.put(`/quotations/${editId}`, body)
        : await api.post('/quotations', body);
      if (res.data.success) {
        const quotationId = editId || res.data.data.id;
        await api.post(`/quotations/${quotationId}/submit`);
        toast.success('Quotation submitted successfully!');
        navigate(`/quotations/${quotationId}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/quotations')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{editId ? 'Edit Quotation' : 'Submit Quotation'}</h1>
          <p className="text-sm text-gray-500">Respond to an RFQ</p>
        </div>
      </div>

      {/* RFQ Selection */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Select RFQ</h3>
        <Select
          label="RFQ"
          options={rfqs.map((r) => ({ value: r.id, label: r.title }))}
          placeholder="Choose an RFQ to quote on"
          value={selectedRfqId}
          onChange={(e) => setSelectedRfqId(e.target.value)}
          disabled={!!editId}
        />
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </div>
      )}

      {rfq && !isLoading && (
        <>
          {/* RFQ Items Pricing */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Product', 'Qty', 'Unit', 'Unit Price', 'Total', 'Notes'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rfq.items.map((item) => {
                    const unitPrice = prices[item.id || ''] || 0;
                    const lineTotal = unitPrice * item.quantity;
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm font-medium text-gray-800">{item.productName}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{item.unit}</td>
                        <td className="px-3 py-2 w-32">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={unitPrice || ''}
                            onChange={(e) => setPrices((prev) => ({
                              ...prev,
                              [item.id || '']: parseFloat(e.target.value) || 0,
                            }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-800">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-3 py-2 w-36">
                          <input
                            type="text"
                            value={itemNotes[item.id || ''] || ''}
                            onChange={(e) => setItemNotes((prev) => ({
                              ...prev,
                              [item.id || '']: e.target.value,
                            }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-primary-50">
                    <td colSpan={4} className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700">
                      Total Amount:
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold text-primary-700">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Quotation Details */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quotation Details</h3>
            <div className="space-y-4">
              <Input
                label="Delivery Timeline *"
                placeholder="e.g. 2-3 weeks, 15 business days"
                value={deliveryTimeline}
                onChange={(e) => setDeliveryTimeline(e.target.value)}
              />
              <TextArea
                label="Additional Notes"
                placeholder="Any additional terms, conditions or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate('/quotations')}>Cancel</Button>
            <Button
              variant="outline"
              leftIcon={<Save size={14} />}
              isLoading={isSaving}
              onClick={handleSave}
            >
              Save as Draft
            </Button>
            <Button
              leftIcon={<Send size={14} />}
              isLoading={isSubmitting}
              onClick={handleSubmit}
            >
              Submit Quotation
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default QuotationForm;
