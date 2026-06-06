import { FormEvent, useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TextField } from '../components/Field';
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
          title={editingId ? 'Edit Vendor' : 'Add Vendor'} 
          subtitle={editingId ? `Updating ${form.name}` : 'Create a new supplier profile.'}
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <TextField label="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="GST number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Contact number" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <div className="full-width">
               <label className="field__label">Status</label>
               <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="inactive">Inactive</option>
               </select>
            </div>
            <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            
            <div className="form-grid__submit row-actions">
              <button className="button button--primary" type="submit">
                {editingId ? 'Update Vendor' : 'Save Vendor'}
              </button>
              {editingId && (
                <button className="button button--ghost" type="button" onClick={cancelEdit}>Cancel</button>
              )}
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Vendor List" subtitle="Search and filter active suppliers.">
          <div className="section-toolbar">
            <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => void load()} />
            <button className="button button--ghost" type="button" onClick={() => void load()}>Search</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <strong>{vendor.name}</strong>
                      <div className="muted small">{vendor.email || 'No email'}</div>
                    </td>
                    <td>{vendor.category || '—'}</td>
                    <td><Badge tone={statusTone(vendor.status)}>{vendor.status}</Badge></td>
                    {isAdmin && (
                      <td>
                        <div className="row-actions">
                          <button className="button button--ghost small" onClick={() => onEdit(vendor)}>Edit</button>
                          <button className="button button--ghost small text-danger" onClick={() => onDelete(vendor.id)}>Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
