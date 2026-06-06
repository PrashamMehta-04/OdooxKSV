import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TextField, TextAreaField } from '../components/Field';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDateTime, statusTone } from '../lib/format';
import { useAuth } from '../lib/auth';
import type { RFQ, RFQLineItem, Vendor } from '../lib/types';

export function VendorSubmissionsPage() {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string>('');
  const [lineItems, setLineItems] = useState<RFQLineItem[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  const [form, setForm] = useState({
    delivery_days: 7,
    payment_terms: 'Net 30',
    gst_percent: 18,
    notes: '',
  });

  const [prices, setPrices] = useState<Record<string, number>>({});

  async function load() {
    const [rfqList, vendorList] = await Promise.all([
      apiFetch<RFQ[]>('/rfqs'),
      apiFetch<Vendor[]>('/vendors'),
    ]);
    setRfqs(rfqList);
    // Find matching vendor by email
    const me = vendorList.find(v => v.email === user?.email);
    if (me) setVendor(me);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedRfqId) {
      void (async () => {
        const data = await apiFetch<{ rfq: RFQ; line_items: RFQLineItem[] }>(`/rfqs/${selectedRfqId}`);
        setLineItems(data.line_items);
        const initialPrices: Record<string, number> = {};
        data.line_items.forEach(item => {
          initialPrices[item.id] = 0;
        });
        setPrices(initialPrices);
      })();
    } else {
      setLineItems([]);
    }
  }, [selectedRfqId]);

  async function onSubmit() {
    if (!selectedRfqId || !vendor) return;

    const items = lineItems.map(item => ({
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: prices[item.id] || 0,
      total_amount: (prices[item.id] || 0) * item.quantity,
    }));

    const totalAmount = items.reduce((acc, curr) => acc + curr.total_amount, 0);

    await apiFetch(`/rfqs/${selectedRfqId}/quotations`, {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: vendor.id,
        total_amount: totalAmount,
        delivery_days: form.delivery_days,
        payment_terms: form.payment_terms,
        gst_percent: form.gst_percent,
        status: 'submitted',
        selected: false,
        line_items: items,
      }),
    });

    setSelectedRfqId('');
    setLineItems([]);
    alert('Quotation submitted successfully!');
  }

  const selectedRfq = rfqs.find(r => r.id === selectedRfqId);

  return (
    <>
      <PageHeader eyebrow="Vendor Tasks" title="Submit quotations for assigned RFQs" description="Review requirements, set your pricing, and define delivery timelines." />
      
      <div className="two-col two-col--wide">
        <SectionCard title="Assigned RFQs" subtitle="Select an RFQ to respond to.">
          <div className="stack-list">
            {rfqs.length > 0 ? (
              rfqs.map((rfq) => (
                <button
                  key={rfq.id}
                  type="button"
                  className={`stack-list__item stack-list__button ${selectedRfqId === rfq.id ? 'stack-list__button--active' : ''}`}
                  onClick={() => setSelectedRfqId(rfq.id)}
                >
                  <div>
                    <strong>{rfq.title}</strong>
                    <p>{rfq.category} · Deadline {rfq.deadline ? formatDateTime(rfq.deadline) : 'N/A'}</p>
                  </div>
                  <Badge tone={statusTone(rfq.status)}>{rfq.status}</Badge>
                </button>
              ))
            ) : (
              <div className="empty-state">No RFQs assigned to you yet.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Quotation Form" subtitle={selectedRfq ? `Responding to: ${selectedRfq.title}` : 'Select an RFQ first.'}>
          {selectedRfq ? (
            <div className="form-stack">
              <div className="form-section">
                <h4 className="form-section__title">Line Item Pricing</h4>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.item_name}</td>
                          <td>{item.quantity} {item.unit}</td>
                          <td>
                            <input
                              type="number"
                              className="input-inline"
                              value={prices[item.id] || ''}
                              onChange={(e) => setPrices({ ...prices, [item.id]: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td>{formatCurrency((prices[item.id] || 0) * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan={3}>Subtotal</th>
                        <th>{formatCurrency(lineItems.reduce((acc, curr) => acc + (prices[curr.id] || 0) * curr.quantity, 0))}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="form-grid">
                <TextField label="Delivery days" type="number" value={form.delivery_days} onChange={(e) => setForm({ ...form, delivery_days: parseInt(e.target.value) })} />
                <TextField label="GST %" type="number" value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: parseFloat(e.target.value) })} />
                <TextField label="Payment terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
                <div className="full-width">
                   <TextAreaField label="Notes/Comments" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
              </div>

              <div className="row-actions">
                <button className="button button--primary" type="button" onClick={onSubmit}>Submit Quotation</button>
              </div>
            </div>
          ) : (
            <div className="empty-state">Please select an RFQ from the left to start your submission.</div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
