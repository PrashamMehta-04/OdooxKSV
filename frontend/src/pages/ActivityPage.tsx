import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { ActivityLog } from '../lib/types';

export function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    void apiFetch<ActivityLog[]>('/activity').then(setLogs);
  }, []);

  return (
    <>
      <PageHeader eyebrow="Activity & Logs" title="Immutable procurement audit trail" description="Write-once records for vendor, RFQ, quotation, approval, PO, and invoice events." />
      <SectionCard title="Audit history" subtitle="These entries are append-only by design.">
        <div className="timeline">
          {logs.map((log) => (
            <article key={log.id} className="timeline__item">
              <div className="timeline__dot" />
              <div className="timeline__content">
                <div className="timeline__row">
                  <strong>{log.action}</strong>
                  <Badge tone="neutral">{log.entity_type}</Badge>
                </div>
                <p>{log.entity_type} · {log.entity_id || 'n/a'}</p>
                <span>{formatDateTime(log.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

