import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/format';
import type { SpendTrendPoint } from '../lib/types';

export function ReportsPage() {
  const [trend, setTrend] = useState<SpendTrendPoint[]>([]);

  useEffect(() => {
    void apiFetch<SpendTrendPoint[]>('/reports/spend-trend?months=6').then(setTrend);
  }, []);

  return (
    <>
      <PageHeader eyebrow="Reports" title="Spending and procurement analytics" description="A lightweight reporting surface for monthly spend and trend direction." />
      <SectionCard title="Spend trend report" subtitle="Last six months.">
        <div className="trend-chart">
          {trend.map((point) => (
            <div key={point.month} className="trend-chart__bar">
              <div className="trend-chart__bar-track">
                <div className="trend-chart__bar-fill" style={{ height: `${Math.min(100, Math.max(12, point.amount / 2500))}%` }} />
              </div>
              <span>{point.month}</span>
              <strong>{formatCurrency(point.amount)}</strong>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

