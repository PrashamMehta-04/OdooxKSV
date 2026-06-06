import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDateTime, statusTone } from '../lib/format';
import type { Quotation, Vendor, RFQ } from '../lib/types';

type QuoteRow = Quotation & { vendor_name?: string; rfq_title?: string };

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuoteRow[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    void (async () => {
      const [q, r, v] = await Promise.all([
        apiFetch<Quotation[]>('/quotations'),
        apiFetch<RFQ[]>('/rfqs'),
        apiFetch<Vendor[]>('/vendors'),
      ]);
      setQuotations(q as QuoteRow[]);
      setRfqs(r);
      setVendors(v);
    })();
  }, []);

  const selected = quotations.find((item) => item.selected);

  return (
    <>
      <PageHeader eyebrow="Quotations Comparison" title="Compare vendor offers" description="Price, delivery, rating, payment terms, GST, and selection state." />
      <div className="two-col two-col--wide">
        <SectionCard title="Quotation summary" subtitle="Winner selection is highlighted.">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RFQ</th>
                  <th>Vendor</th>
                  <th>Total</th>
                  <th>Delivery</th>
                  <th>Rating</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quotation) => (
                  <tr key={quotation.id} className={quotation.selected ? 'row-highlight' : ''}>
                    <td>{rfqs.find((rfq) => rfq.id === quotation.rfq_id)?.title || quotation.rfq_id}</td>
                    <td>{vendors.find((vendor) => vendor.id === quotation.vendor_id)?.name || quotation.vendor_id}</td>
                    <td>{formatCurrency(quotation.total_amount)}</td>
                    <td>{quotation.delivery_days ?? '—'} days</td>
                    <td>{quotation.rating ? `${quotation.rating.toFixed(1)}/5` : '—'}</td>
                    <td><Badge tone={statusTone(quotation.status)}>{quotation.selected ? 'selected' : quotation.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Comparison notes" subtitle="Useful when reviewing vendor quotes in the procurement head office.">
          {selected ? (
            <div className="quote-panel">
              <div className="quote-panel__hero">
                <strong>{vendors.find((vendor) => vendor.id === selected.vendor_id)?.name || selected.vendor_id}</strong>
                <Badge tone="success">Winning quote</Badge>
              </div>
              <p>Total {formatCurrency(selected.total_amount)} · Delivery {selected.delivery_days ?? '—'} days · Payment {selected.payment_terms || 'N/A'}</p>
              <p>Updated {formatDateTime(selected.updated_at)}</p>
            </div>
          ) : (
            <div className="empty-state">No selected quotation yet.</div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

