import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Badge } from '../components/Badge';
import { SelectField, TextAreaField, TextField } from '../components/Field';
import { apiFetch } from '../lib/api';
import { formatDateTime, statusTone } from '../lib/format';
import type { Approval } from '../lib/types';

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('approved');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const items = await apiFetch<Approval[]>('/approvals?status=pending');
      setApprovals(items);
      setSelectedId((current) => current || items[0]?.id || '');
    } finally {
      setLoading(false);
    }
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
      <PageHeader eyebrow="Review Workflow" title="Decision & Approvals" description="Review selected quotations and provide financial oversight." />
      
      <div className="two-col two-col--wide">
        <SectionCard title="Approval Queue" subtitle="Requests awaiting your review.">
          <div className="data-grid" style={{ gridTemplateColumns: '1fr' }}>
            {loading ? (
              <div className="empty-state">Loading queue...</div>
            ) : approvals.length > 0 ? (
              approvals.map((approval) => (
                <button
                  key={approval.id}
                  type="button"
                  className={`data-card stack-list__button ${selectedId === approval.id ? 'stack-list__button--active row-highlight' : ''}`}
                  onClick={() => setSelectedId(approval.id)}
                >
                  <div className="data-card__header">
                    <div>
                      <strong className="data-card__title">{approval.rfq_title}</strong>
                      <div className="activity-desc" style={{ fontSize: '0.85rem' }}>{approval.vendor_name}</div>
                      <div className="muted small">Stage: {approval.level}</div>
                    </div>
                    <Badge tone={statusTone(approval.status)}>{approval.status}</Badge>
                  </div>
                  <div className="data-card__stats">
                    <div className="data-stat-row">
                      <span className="label">Last Action</span>
                      <span className="value">{formatDateTime(approval.updated_at)}</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-state">No pending approvals found.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Decision Panel" subtitle={selected ? `Reviewing RFQ: ${selected.rfq_title}` : 'Select a request to decide.'}>
          {selected ? (
            <div className="modern-form">
              <div className="form-group-section">
                <h4 className="section-header">Evaluation</h4>
                <div className="field-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <TextField label="Current Level" value={selected.level} readOnly />
                  <SelectField label="Your Decision" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="approved">Approve - Proceed to next stage</option>
                    <option value="rejected">Reject - Halt procurement</option>
                  </SelectField>
                  <div className="full-width">
                    <TextAreaField label="Decision Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} placeholder="Provide reasoning for your decision..." />
                  </div>
                </div>
              </div>

              <div className="form-actions-bar">
                <button className="button button--primary" type="button" onClick={decide}>Submit Decision</button>
                <div className="ml-auto muted small">Request ID: {selected.id}</div>
              </div>
            </div>
          ) : (
            <div className="empty-state">Please select an approval request from the left to view details and submit your decision.</div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

