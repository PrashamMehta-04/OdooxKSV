import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TrendChart } from '../components/TrendChart';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/format';
import type { ProcurementStats, SpendTrendPoint } from '../lib/types';

export function ReportsPage() {
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [trend, setTrend] = useState<SpendTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        apiFetch<ProcurementStats>('/reports/stats'),
        apiFetch<SpendTrendPoint[]>('/reports/spend-trend?months=12'),
      ]);
      setStats(s);
      setTrend(t);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function exportToCSV() {
    if (!stats) return;
    
    let csv = 'Vendor Name,Quotations,Awarded,Avg Delivery Days,Total Revenue\n';
    stats.vendor_performance.forEach(v => {
      csv += `${v.name},${v.quotes_count},${v.awarded_count},${v.avg_delivery_days.toFixed(1)},${v.total_revenue}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'vendor_performance_report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <>
      <PageHeader 
        eyebrow="Intelligence" 
        title="Procurement Analytics" 
        description="Comprehensive insights into spending patterns, vendor performance, and operational efficiency."
        actions={
          <button className="button button--primary" onClick={exportToCSV} disabled={!stats}>
            Export Performance CSV
          </button>
        }
      />

      <div className="dashboard-metrics">
        <div className="metric-card">
          <h3>Total RFQs</h3>
          <div className="value">{stats?.total_rfqs ?? '—'}</div>
        </div>
        <div className="metric-card">
          <h3>Conversion Rate</h3>
          <div className="value">
            {stats ? ((stats.total_pos / (stats.total_rfqs || 1)) * 100).toFixed(0) : '—'}%
          </div>
        </div>
        <div className="metric-card">
          <h3>Avg Quote</h3>
          <div className="value">{stats ? formatCurrency(stats.avg_quote_amount) : '—'}</div>
        </div>
        <div className="metric-card">
          <h3>Total Invoiced</h3>
          <div className="value">{stats ? formatCurrency(stats.total_spend) : '—'}</div>
        </div>
      </div>

      <div className="two-col two-col--wide">
        <SectionCard title="Spending Trends" subtitle="Annual overview of procurement volume.">
          <div className="card-chart-container">
            {loading ? (
              <div className="empty-state">Calculating trends...</div>
            ) : trend.length > 0 ? (
              <TrendChart data={trend} type="line" />
            ) : (
              <div className="empty-state">No historical data found.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Spend by Category" subtitle="Distribution of costs across departments.">
          <div className="data-grid" style={{ gridTemplateColumns: '1fr' }}>
            {stats?.category_spend?.map((c) => (
              <div key={c.category} className="data-card">
                <div className="data-stat-row">
                  <span className="label" style={{ fontSize: '1rem', fontWeight: 700 }}>{c.category}</span>
                  <span className="value" style={{ fontSize: '1.1rem' }}>{formatCurrency(c.amount)}</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${(c.amount / (stats.total_spend || 1)) * 100}%`, 
                      height: '100%', 
                      background: 'var(--accent)' 
                    }} 
                  />
                </div>
              </div>
            ))}
            {(!stats?.category_spend || stats.category_spend.length === 0) && (
              <div className="empty-state">No categorized spend data.</div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Vendor Performance" subtitle="Evaluation of supplier engagement and reliability.">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Quotes Submitted</th>
                <th>Awarded Contracts</th>
                <th>Success Rate</th>
                <th>Avg. Delivery</th>
                <th>Total Revenue (INR)</th>
              </tr>
            </thead>
            <tbody>
              {stats?.vendor_performance?.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.quotes_count}</td>
                  <td>{v.awarded_count}</td>
                  <td>{((v.awarded_count / (v.quotes_count || 1)) * 100).toFixed(0)}%</td>
                  <td>{v.avg_delivery_days.toFixed(1)} days</td>
                  <td>{formatCurrency(v.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.vendor_performance || stats.vendor_performance.length === 0) && (
            <div className="empty-state">No vendor metrics available yet.</div>
          )}
        </div>
      </SectionCard>
    </>
  );
}
