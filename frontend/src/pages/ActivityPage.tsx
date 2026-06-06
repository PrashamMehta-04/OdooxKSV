import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { apiFetch } from '../lib/api';
import { formatDateTime, formatActivity } from '../lib/format';
import type { ActivityLog } from '../lib/types';

export function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const offset = page * limit;
      const data = await apiFetch<ActivityLog[]>(`/activity?limit=${limit}&offset=${offset}`);
      setLogs(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  return (
    <>
      <PageHeader eyebrow="Activity & Logs" title="Procurement Audit Trail" description="A complete, immutable history of all workflow events across the platform." />
      
      <SectionCard title="Workflow History" subtitle="Chronological list of all system activities.">
        <div className="stack-list">
          {loading ? (
            <div className="empty-state">Refreshing audit trail...</div>
          ) : logs.length > 0 ? (
            logs.map((item) => (
              <div key={item.id} className="stack-list__item">
                <div className="activity-row">
                  <div className="activity-icon">
                    {item.entity_type === 'rfq' && '📝'}
                    {item.entity_type === 'vendor' && '🏢'}
                    {item.entity_type === 'quotation' && '💰'}
                    {item.entity_type === 'purchase_order' && '📦'}
                    {item.entity_type === 'invoice' && '📄'}
                    {item.entity_type === 'approval' && '⚖️'}
                    {item.entity_type === 'user' && '👤'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-desc">{formatActivity(item)}</div>
                    <div className="activity-meta">
                      <span className="text-uppercase">{item.entity_type}</span>
                      <span className="dot">·</span>
                      <span>{formatDateTime(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No activity records found.</div>
          )}
        </div>

        <div className="form-actions-bar" style={{ justifyContent: 'center', marginTop: '20px' }}>
          <button 
            className="button button--ghost" 
            disabled={page === 0 || loading} 
            onClick={() => setPage(p => p - 1)}
          >
            ← Previous Page
          </button>
          <div style={{ alignSelf: 'center', fontWeight: 600, color: 'var(--muted)' }}>
            Page {page + 1}
          </div>
          <button 
            className="button button--ghost" 
            disabled={logs.length < limit || loading} 
            onClick={() => setPage(p => p + 1)}
          >
            Next Page →
          </button>
        </div>
      </SectionCard>
    </>
  );
}

