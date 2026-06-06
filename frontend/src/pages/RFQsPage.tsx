import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TextAreaField, TextField } from '../components/Field';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatDateTime, statusTone } from '../lib/format';
import type { RFQ, Vendor } from '../lib/types';

export function RFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Furniture',
    deadline: '',
    status: 'draft',
  });

  const [lineItems, setLineItems] = useState<{ item_name: string; quantity: number; unit: string }[]>([]);
  const [newItem, setNewItem] = useState({ item_name: '', quantity: 1, unit: 'pcs' });
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const [rfqResp, vendorResp] = await Promise.all([
      apiFetch<RFQ[]>(`/rfqs${params.size ? `?${params.toString()}` : ''}`),
      apiFetch<Vendor[]>('/vendors'),
    ]);
    setRfqs(rfqResp);
    setVendors(vendorResp);
  }

  useEffect(() => {
    void load();
  }, []);

  function addLineItem() {
    if (!newItem.item_name) return;
    setLineItems([...lineItems, newItem]);
    setNewItem({ item_name: '', quantity: 1, unit: 'pcs' });
  }

  function toggleVendor(id: string) {
    setSelectedVendors((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await apiFetch<RFQ>('/rfqs', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        deadline: form.deadline || undefined,
        line_items: lineItems,
        vendor_ids: selectedVendors,
        attachments: [],
      }),
    });
    setForm({ title: '', description: '', category: 'Furniture', deadline: '', status: 'draft' });
    setLineItems([]);
    setSelectedVendors([]);
    await load();
  }

  return (
    <>
      <PageHeader eyebrow="RFQ's Page" title="Create and track request for quotations" description="Draft RFQs with due dates, descriptions, and category context." />
      <div className="two-col two-col--wide">
        <div className="stack">
          <SectionCard title="Create RFQ" subtitle="Start a new procurement request.">
            <form className="form-grid" onSubmit={onSubmit}>
              <TextField label="RFQ title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <TextField label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              <TextAreaField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} />

              <div className="form-section">
                <h4 className="form-section__title">Line Items</h4>
                <div className="line-item-form">
                  <TextField label="Item name" value={newItem.item_name} onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })} />
                  <div className="row">
                    <TextField label="Qty" type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })} />
                    <TextField label="Unit" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                  </div>
                  <button type="button" className="button button--ghost" onClick={addLineItem}>Add Item</button>
                </div>

                <div className="line-item-list">
                  {lineItems.map((item, i) => (
                    <div key={i} className="line-item-list__item">
                      <span>{item.item_name}</span>
                      <Badge tone="neutral">{item.quantity} {item.unit}</Badge>
                      <button type="button" className="button-icon" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))}>×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h4 className="form-section__title">Assign Vendors</h4>
                <div className="vendor-assignment-list">
                  {vendors.map((vendor) => (
                    <label key={vendor.id} className="checkbox-item">
                      <input type="checkbox" checked={selectedVendors.includes(vendor.id)} onChange={() => toggleVendor(vendor.id)} />
                      <span>{vendor.name} <small>({vendor.category})</small></span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="button button--primary form-grid__submit" type="submit">Save RFQ</button>
            </form>
          </SectionCard>
        </div>

        <SectionCard title="RFQ library" subtitle="Existing requests grouped by status.">
          <div className="section-toolbar">
            <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => void load()} />
            <button className="button button--ghost" type="button" onClick={() => void load()}>Search</button>
          </div>
          <div className="stack-list">
            {rfqs.map((rfq) => (
              <div key={rfq.id} className="stack-list__item stack-list__item--compact">
                <div>
                  <strong>{rfq.title}</strong>
                  <p>{rfq.category || 'No category'} · Deadline {rfq.deadline ? formatDateTime(rfq.deadline) : 'TBD'}</p>
                </div>
                <Badge tone={statusTone(rfq.status)}>{rfq.status}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

