import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Badge } from '../components/Badge';
import { TextAreaField, TextField } from '../components/Field';
import { apiFetch } from '../lib/api';
import { formatDateTime, statusTone } from '../lib/format';
import type { Approval } from '../lib/types';

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('approved');

  async function load() {
    const items = await apiFetch<Approval[]>('/approvals');
    setApprovals(items);
    setSelectedId((current) => current || items[0]?.id || '');
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide() {
    if (!selectedId) return;
    await apiFetch(`/approvals/${selectedId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ status, remarks }),
    });
    setRemarks('');
    await load();
  }

  const selected = approvals.find((item) => item.id === selectedId);

  return (
    <>
      <PageHeader eyebrow="Approval Workflow" title="Review and decide quotation approvals" description="Use comments to approve or reject the selected vendor quote." />
      <div className="two-col two-col--wide">
        <SectionCard title="Pending approvals" subtitle="L1 and L2 queue.">
          <div className="stack-list">
            {approvals.map((approval) => (
              <button key={approval.id} type="button" className={`stack-list__item stack-list__button ${selectedId === approval.id ? 'stack-list__button--active' : ''}`} onClick={() => setSelectedId(approval.id)}>
                <div>
                  <strong>{approval.level}</strong>
                  <p>{approval.quotation_id}</p>
                </div>
                <Badge tone={statusTone(approval.status)}>{approval.status}</Badge>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Decision panel" subtitle="Approve or reject the selected approval.">
          {selected ? (
            <div className="form-stack">
              <TextField label="Approval level" value={selected.level} readOnly />
              <TextField label="Status" value={status} onChange={(e) => setStatus(e.target.value)} />
              <TextAreaField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} />
              <div className="row-actions">
                <button className="button button--primary" type="button" onClick={decide}>Submit decision</button>
                <span className="muted">Last updated {formatDateTime(selected.updated_at)}</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">No approval selected.</div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

