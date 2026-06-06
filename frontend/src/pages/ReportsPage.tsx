import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TrendChart } from '../components/TrendChart';
import { apiFetch } from '../lib/api';
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
        <div className="card-chart-container">
          {trend.length ? (
            <TrendChart data={trend} type="line" />
          ) : (
            <div className="empty-state full-width">No historical data available for reporting.</div>
          )}
        </div>
      </SectionCard>
    </>
  );
}

