import { FormEvent, useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TextField, SelectField } from '../components/Field';
import { apiFetch } from '../lib/api';
import { statusTone } from '../lib/format';
import { useAuth } from '../lib/auth';
import type { Vendor } from '../lib/types';

export function VendorsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
    name: '',
    gst_number: '',
    category: '',
    contact_number: '',
    email: '',
    country: 'India',
    status: 'pending',
    notes: '',
  };

  const [form, setForm] = useState(initialForm);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const response = await apiFetch<Vendor[]>(`/vendors${params.size ? `?${params.toString()}` : ''}`);
    setVendors(response);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      await apiFetch(`/vendors/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
    } else {
      await apiFetch<Vendor>('/vendors', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    setForm(initialForm);
    setEditingId(null);
    await load();
  }

  function onEdit(vendor: Vendor) {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name,
      gst_number: vendor.gst_number || '',
      category: vendor.category || '',
      contact_number: vendor.contact_number || '',
      email: vendor.email || '',
      country: vendor.country || 'India',
      status: vendor.status,
      notes: vendor.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDelete(id: string) {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    await apiFetch(`/vendors/${id}`, { method: 'DELETE' });
    await load();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
  }

  return (
    <>
      <PageHeader eyebrow="Supplier Directory" title="Vendor Management" description="Register and manage your supply chain partners." />
      
      <div className="two-col two-col--wide">
        <SectionCard 
          title={editingId ? 'Edit Vendor Profile' : 'Register New Vendor'} 
          subtitle={editingId ? `Management context for ${form.name}` : 'Onboard a new supply chain partner.'}
        >
          <form className="modern-form" onSubmit={onSubmit}>
            {editingId && (
              <div className="form-profile-header">
                <div className="vendor-avatar large">{form.name.charAt(0)}</div>
                <div className="profile-info">
                  <h3>{form.name}</h3>
                  <Badge tone={statusTone(form.status)}>{form.status}</Badge>
                </div>
              </div>
            )}

            <div className="form-sections-grid">
              <div className="form-group-section">
                <h4 className="section-header">Partner Information</h4>
                <div className="field-grid">
                  <TextField label="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Acme Corp" />
                  <TextField label="Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vendor@example.com" />
                  
                  <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Logistics" />
                  <TextField label="Phone Number" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} placeholder="+1..." />
                  
                  <TextField label="GST / Tax ID" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} placeholder="Tax registration number" />
                  <TextField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  
                  <SelectField label="Onboarding" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved / Active</option>
                    <option value="rejected">Rejected</option>
                    <option value="inactive">Inactive / Archived</option>
                  </SelectField>
                </div>
              </div>

              <div className="form-group-section">
                <h4 className="section-header">Internal Notes</h4>
                <div className="field-grid">
                   <div className="full-width">
                      <TextField label="Confidential Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add any private procurement notes here..." />
                   </div>
                </div>
              </div>
            </div>
            
            <div className="form-actions-bar">
              <button className="button button--primary" type="submit">
                {editingId ? 'Update Record' : 'Register Vendor'}
              </button>
              {editingId && (
                <button className="button button--ghost" type="button" onClick={cancelEdit}>Cancel Changes</button>
              )}
            </div>
          </form>
        </SectionCard>

        <div className="vendor-directory">
          <SectionCard title="Vendor Directory" subtitle="Browse and manage active suppliers.">
            <div className="section-toolbar">
              <TextField label="Search suppliers" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => void load()} placeholder="Name, GST, or category..." />
              <button className="button button--ghost" type="button" onClick={() => void load()}>Search</button>
            </div>
            
            <div className="data-grid">
              {vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <div key={vendor.id} className="data-card">
                    <div className="data-card__header">
                      <div className="activity-row">
                        <div className="vendor-avatar-mini">{vendor.name.charAt(0)}</div>
                        <div>
                          <strong className="data-card__title">{vendor.name}</strong>
                          <div className="muted small">{vendor.email || 'No email'}</div>
                        </div>
                      </div>
                      <Badge tone={statusTone(vendor.status)}>{vendor.status}</Badge>
                    </div>

                    <div className="data-card__stats">
                      <div className="data-stat-row">
                        <span className="label">Category</span>
                        <span className="value">{vendor.category || '—'}</span>
                      </div>
                      <div className="data-stat-row">
                        <span className="label">GST Number</span>
                        <span className="value">{vendor.gst_number || '—'}</span>
                      </div>
                      {vendor.contact_number && (
                        <div className="data-stat-row">
                          <span className="label">Phone</span>
                          <span className="value">{vendor.contact_number}</span>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="data-card__footer">
                        <button className="button button--ghost small" onClick={() => onEdit(vendor)}>Edit</button>
                        <button className="button button--ghost small text-danger" onClick={() => onDelete(vendor.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state full-width">No vendors found matching your search.</div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
