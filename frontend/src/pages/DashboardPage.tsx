import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDateTime, formatActivity } from '../lib/format';
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
        title="Dashboard"
        description="Main Landing Page"
      />

      <div className="dashboard-metrics">
        <div className="metric-card">
          <h3>Total Spend</h3>
          <div className="value">{metrics ? formatCurrency(metrics.total_spend) : '—'}</div>
        </div>
        <div className="metric-card">
          <h3>Active RFQs</h3>
          <div className="value">{metrics?.active_rfqs ?? '—'}</div>
        </div>
        <div className="metric-card">
          <h3>Pending Approvals</h3>
          <div className="value">{metrics?.pending_approvals ?? '—'}</div>
        </div>
        <div className="metric-card">
          <h3>POs This Month</h3>
          <div className="value">{metrics?.pos_this_month ?? '—'}</div>
        </div>
      </div>

      <div className="two-col">
        <SectionCard title="Spending trends" subtitle="Visual spend analytics">
          <div className="trend-chart">
            {trend.length ? (
              trend.map((point) => (
                <div key={point.month} className="trend-chart__bar">
                  <div className="trend-chart__bar-track">
                    <div
                      className="trend-chart__bar-fill"
                      style={{ 
                        height: `${Math.min(100, Math.max(12, point.amount / 2500))}%`,
                        background: 'var(--accent)'
                      }}
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

        <SectionCard title="Recent activity" subtitle="Workflow audit trail">
          <div className="stack-list">
            {activity.length > 0 ? (
              activity.map((item) => (
                <div key={item.id} className="stack-list__item stack-list__item--compact">
                  <div className="activity-row">
                    <div className="activity-icon">
                      {item.entity_type === 'rfq' && '📝'}
                      {item.entity_type === 'vendor' && '🏢'}
                      {item.entity_type === 'quotation' && '💰'}
                      {item.entity_type === 'purchase_order' && '📦'}
                      {item.entity_type === 'invoice' && '📄'}
                      {item.entity_type === 'approval' && '⚖️'}
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
              <div className="empty-state">No recent activity.</div>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

