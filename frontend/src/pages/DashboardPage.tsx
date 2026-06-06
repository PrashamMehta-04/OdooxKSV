import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/format';
import type { ActivityLog, DashboardMetrics, SpendTrendPoint } from '../lib/types';

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trend, setTrend] = useState<SpendTrendPoint[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    void (async () => {
      const [dashboard, logs] = await Promise.all([
        apiFetch<{ metrics: DashboardMetrics; trend: SpendTrendPoint[] }>('/dashboard'),
        apiFetch<ActivityLog[]>('/activity?limit=5'),
      ]);
      setMetrics(dashboard.metrics);
      setTrend(dashboard.trend);
      setActivity(logs);
    })();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Main Landing Page"
        title="Today's procurement overview"
        description="Live counts, approvals, monthly orders, overdue invoices, and spend momentum."
      />

      <div className="stat-grid">
        <StatCard label="Total Spend" value={metrics ? formatCurrency(metrics.total_spend) : '—'} detail="All approved invoices" />
        <StatCard label="Active RFQs" value={metrics?.active_rfqs ?? '—'} detail="Draft through approval" />
        <StatCard label="Pending Approvals" value={metrics?.pending_approvals ?? '—'} detail="Waiting for L1 or L2" />
        <StatCard label="POs This Month" value={metrics?.pos_this_month ?? '—'} detail="Generated from approvals" />
        <StatCard label="Overdue Invoices" value={metrics?.overdue_invoices ?? '—'} detail="Needs finance attention" />
      </div>

      <div className="two-col">
        <SectionCard title="Spending trends" subtitle="A visual read on the last few months of procurement spend.">
          <div className="trend-chart">
            {trend.length ? (
              trend.map((point) => (
                <div key={point.month} className="trend-chart__bar">
                  <div className="trend-chart__bar-track">
                    <div
                      className="trend-chart__bar-fill"
                      style={{ height: `${Math.min(100, Math.max(12, point.amount / 2500))}%` }}
                    />
                  </div>
                  <span>{point.month}</span>
                  <strong>{formatCurrency(point.amount)}</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">No spend history yet.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Recent activity" subtitle="The latest immutable workflow events.">
          <div className="stack-list">
            {activity.map((item) => (
              <div key={item.id} className="stack-list__item">
                <div>
                  <strong>{item.action}</strong>
                  <p>{item.entity_type} · {item.entity_id || 'n/a'}</p>
                </div>
                <div className="stack-list__meta">
                  <Badge tone="neutral">{item.entity_type}</Badge>
                  <span>{formatDateTime(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

