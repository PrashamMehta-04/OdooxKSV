import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/format';
import type { Quotation, Vendor, RFQ } from '../lib/types';

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string>('');

  async function load() {
    const [q, r, v] = await Promise.all([
      apiFetch<Quotation[]>('/quotations'),
      apiFetch<RFQ[]>('/rfqs'),
      apiFetch<Vendor[]>('/vendors'),
    ]);
    setQuotations(q);
    setRfqs(r);
    setVendors(v);
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredQuotes = quotations.filter(q => q.rfq_id === selectedRfqId);
  const minPrice = filteredQuotes.length ? Math.min(...filteredQuotes.map(q => q.total_amount)) : 0;
  const minDelivery = filteredQuotes.length ? Math.min(...filteredQuotes.map(q => q.delivery_days || 999)) : 0;

  async function selectWinner(id: string) {
    await apiFetch(`/quotations/${id}/select`, { method: 'POST' });
    await load();
  }

  return (
    <>
      <PageHeader eyebrow="Quotations Comparison" title="Compare vendor offers" description="Side-by-side analysis of price, delivery, and terms to select the best vendor." />
      
      <div className="section-toolbar">
        <div className="filter-group">
          <label className="filter-label">Select RFQ to compare:</label>
          <select className="input-inline" value={selectedRfqId} onChange={(e) => setSelectedRfqId(e.target.value)}>
            <option value="">-- Choose RFQ --</option>
            {rfqs.map(rfq => (
              <option key={rfq.id} value={rfq.id}>{rfq.title} ({rfq.status})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedRfqId ? (
        <div className="comparison-grid">
          {filteredQuotes.length > 0 ? (
            filteredQuotes.map((q) => {
              const vendor = vendors.find(v => v.id === q.vendor_id);
              const isLowestPrice = q.total_amount === minPrice;
              const isBestDelivery = q.delivery_days === minDelivery;

              return (
                <div key={q.id} className={`comparison-card ${q.selected ? 'comparison-card--selected' : ''}`}>
                  <div className="comparison-card__header">
                    <strong>{vendor?.name || 'Unknown Vendor'}</strong>
                    {q.selected && <Badge tone="success">Winner</Badge>}
                  </div>
                  
                  <div className="comparison-card__body">
                    <div className="comparison-stat">
                      <label>Total Amount</label>
                      <div className={`comparison-stat__value ${isLowestPrice ? 'text-success' : ''}`}>
                        {formatCurrency(q.total_amount)}
                        {isLowestPrice && <span className="mini-badge">Lowest</span>}
                      </div>
                    </div>

                    <div className="comparison-stat">
                      <label>Delivery</label>
                      <div className={`comparison-stat__value ${isBestDelivery ? 'text-info' : ''}`}>
                        {q.delivery_days} days
                        {isBestDelivery && <span className="mini-badge mini-badge--info">Fastest</span>}
                      </div>
                    </div>

                    <div className="comparison-stat">
                      <label>Payment Terms</label>
                      <p>{q.payment_terms || 'Standard'}</p>
                    </div>

                    <div className="comparison-stat">
                      <label>Rating</label>
                      <p>{q.rating ? `${q.rating.toFixed(1)}/5` : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="comparison-card__footer">
                    {!q.selected && q.status !== 'rejected' && (
                      <button className="button button--primary full-width" onClick={() => selectWinner(q.id)}>Select as Winner</button>
                    )}
                    {q.status === 'rejected' && <Badge tone="danger">Rejected</Badge>}
                    <div className="muted small mt-2">Submitted {formatDateTime(q.created_at)}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state full-width">No quotations submitted for this RFQ yet.</div>
          )}
        </div>
      ) : (
        <div className="empty-state">Please select an RFQ from the dropdown above to compare vendor quotes.</div>
      )}
    </>
  );
}

