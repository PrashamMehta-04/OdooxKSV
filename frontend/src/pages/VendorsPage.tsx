import { FormEvent, useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TextField } from '../components/Field';
import { apiFetch } from '../lib/api';
import { formatDateTime, statusTone } from '../lib/format';
import type { Vendor } from '../lib/types';

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    gst_number: '',
    category: '',
    contact_number: '',
    email: '',
    country: 'India',
    status: 'pending',
    notes: '',
  });

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
    await apiFetch<Vendor>('/vendors', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setForm({ name: '', gst_number: '', category: '', contact_number: '', email: '', country: 'India', status: 'pending', notes: '' });
    await load();
  }

  return (
    <>
      <PageHeader eyebrow="Vendors Page" title="Supplier profiles and registrations" description="Register, search, filter, and manage supplier status from one page." />
      <div className="two-col two-col--wide">
        <SectionCard title="Add vendor" subtitle="Create a new supplier profile and keep the procurement workspace current.">
          <form className="form-grid" onSubmit={onSubmit}>
            <TextField label="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="GST number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Contact number" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <TextField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button className="button button--primary form-grid__submit" type="submit">Save vendor</button>
          </form>
        </SectionCard>

        <SectionCard title="Vendor list" subtitle="Search by name, GST, or category.">
          <div className="section-toolbar">
            <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => void load()} />
            <button className="button button--ghost" type="button" onClick={() => void load()}>Search</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>GST</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <strong>{vendor.name}</strong>
                      <div className="muted">{vendor.email || vendor.contact_number || 'No contact yet'}</div>
                    </td>
                    <td>{vendor.category || '—'}</td>
                    <td>{vendor.gst_number || '—'}</td>
                    <td><Badge tone={statusTone(vendor.status)}>{vendor.status}</Badge></td>
                    <td>{formatDateTime(vendor.updated_at)}</td>
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

