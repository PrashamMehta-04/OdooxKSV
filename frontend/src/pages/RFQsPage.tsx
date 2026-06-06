import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TextAreaField, TextField } from '../components/Field';
import { Badge } from '../components/Badge';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { navigate } from '../lib/router';
import { formatDateTime, statusTone } from '../lib/format';
import type { RFQ, Vendor } from '../lib/types';

export function RFQsPage() {
  const { user } = useAuth();
  const isInternal = user?.role !== 'vendor';
  
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
    
    const promises: [Promise<RFQ[]>, Promise<Vendor[]>] = [
      apiFetch<RFQ[]>(`/rfqs${params.size ? `?${params.toString()}` : ''}`),
      isInternal ? apiFetch<Vendor[]>('/vendors') : Promise.resolve([]),
    ];

    const [rfqResp, vendorResp] = await Promise.all(promises);
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
        status: 'open',
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
      <PageHeader eyebrow="Procurement Workflow" title={isInternal ? "Create Request for Quotation" : "Assigned RFQs"} description={isInternal ? "Define your requirements, add line items, and invite vendors to bid." : "Review procurement requests assigned to your profile."} />
      <div className={isInternal ? "two-col two-col--wide" : ""}>
        {isInternal && (
          <div className="stack">
            <SectionCard title="RFQ Configuration" subtitle="Define the scope and deadline for this request.">
              <form className="modern-form" onSubmit={onSubmit}>
                <div className="form-sections-grid">
                  <div className="form-group-section">
                    <h4 className="section-header">General Information</h4>
                    <div className="field-grid">
                      <TextField label="RFQ title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Office Chairs for H.O." />
                      <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                      <TextField label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                    </div>
                  </div>

                  <div className="form-group-section">
                    <h4 className="section-header">Requirements & Items</h4>
                    <div className="field-stack">
                      <div className="full-width">
                         <TextAreaField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Detailed specifications..." />
                      </div>
                      
                      <div className="line-item-creator">
                        <div className="field-grid">
                          <TextField label="Item name" value={newItem.item_name} onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })} />
                          <div className="row">
                            <TextField label="Qty" type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })} />
                            <TextField label="Unit" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                          </div>
                        </div>
                        <button type="button" className="button button--ghost" onClick={addLineItem}>+ Add Line Item</button>
                      </div>

                      {lineItems.length > 0 && (
                        <div className="line-item-list">
                          {lineItems.map((item, i) => (
                            <div key={i} className="line-item-list__item">
                              <span>{item.item_name}</span>
                              <div className="row-actions">
                                 <Badge tone="neutral">{item.quantity} {item.unit}</Badge>
                                 <button type="button" className="button-icon" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))}>×</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group-section">
                    <h4 className="section-header">Vendor Assignment</h4>
                    <div className="vendor-assignment-list">
                      {vendors.map((vendor) => (
                        <label key={vendor.id} className="checkbox-item">
                          <input type="checkbox" checked={selectedVendors.includes(vendor.id)} onChange={() => toggleVendor(vendor.id)} />
                          <span>{vendor.name} <small className="muted">({vendor.category})</small></span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-actions-bar">
                  <button className="button button--primary" type="submit">Publish RFQ</button>
                  <button className="button button--ghost" type="button" onClick={() => navigate('dashboard')}>Discard</button>
                </div>
              </form>
            </SectionCard>
          </div>
        )}

        <SectionCard title="RFQ Library" subtitle={isInternal ? "Browse historical and active requests." : "Current procurement invitations."}>
          <div className="section-toolbar">
            <TextField label="Filter by title" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => void load()} />
            <button className="button button--ghost" type="button" onClick={() => void load()}>Search</button>
          </div>
          <div className="data-grid">
            {rfqs.length > 0 ? (
              rfqs.map((rfq) => (
                <div key={rfq.id} className="data-card">
                  <div className="data-card__header">
                    <div>
                      <strong className="data-card__title">{rfq.title}</strong>
                      <div className="muted small">{rfq.category}</div>
                    </div>
                    <Badge tone={statusTone(rfq.status)}>{rfq.status}</Badge>
                  </div>
                  
                  <div className="data-card__stats">
                    <div className="data-stat-row">
                      <span className="label">Deadline</span>
                      <span className="value">{rfq.deadline ? formatDateTime(rfq.deadline) : 'TBD'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state full-width">No RFQs found.</div>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
