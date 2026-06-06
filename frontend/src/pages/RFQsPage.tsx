import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TextAreaField, TextField } from '../components/Field';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatDateTime, statusTone } from '../lib/format';
import type { RFQ } from '../lib/types';

export function RFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Furniture',
    deadline: '',
    status: 'draft',
  });

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const response = await apiFetch<RFQ[]>(`/rfqs${params.size ? `?${params.toString()}` : ''}`);
    setRfqs(response);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await apiFetch<RFQ>('/rfqs', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        deadline: form.deadline || undefined,
        line_items: [],
        vendor_ids: [],
        attachments: [],
      }),
    });
    setForm({ title: '', description: '', category: 'Furniture', deadline: '', status: 'draft' });
    await load();
  }

  return (
    <>
      <PageHeader eyebrow="RFQ's Page" title="Create and track request for quotations" description="Draft RFQs with due dates, descriptions, and category context." />
      <div className="two-col two-col--wide">
        <SectionCard title="Create RFQ" subtitle="Start a new procurement request.">
          <form className="form-grid" onSubmit={onSubmit}>
            <TextField label="RFQ title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            <TextAreaField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} />
            <button className="button button--primary form-grid__submit" type="submit">Save RFQ</button>
          </form>
        </SectionCard>

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

