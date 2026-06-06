import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDateTime, statusTone } from '../lib/format';
import type { Quotation, Vendor, RFQ } from '../lib/types';

export function QuotationsPage() {
  const { user } = useAuth();
  const isInternal = user?.role !== 'vendor';

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string>('');

  async function load() {
    const promises: [Promise<Quotation[]>, Promise<RFQ[]>, Promise<Vendor[]>] = [
      apiFetch<Quotation[]>('/quotations'),
      apiFetch<RFQ[]>('/rfqs'),
      isInternal ? apiFetch<Vendor[]>('/vendors') : Promise.resolve([]),
    ];

    const [q, r, v] = await Promise.all(promises);
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
        <div className="data-grid">
          {filteredQuotes.length > 0 ? (
            filteredQuotes.map((q) => {
              const vendor = vendors.find(v => v.id === q.vendor_id);
              const isLowestPrice = q.total_amount === minPrice;
              const isBestDelivery = q.delivery_days === minDelivery;

              return (
                <div key={q.id} className={`data-card ${q.selected ? 'row-highlight' : ''}`}>
                  <div className="data-card__header">
                    <div>
                      <strong className="data-card__title">{vendor?.name || 'Unknown Vendor'}</strong>
                      <div className="muted small">Submitted {formatDateTime(q.created_at)}</div>
                    </div>
                    <div className="row-actions">
                      {q.selected && <Badge tone="success">Winner</Badge>}
                      <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                    </div>
                  </div>
                  
                  <div className="data-card__stats">
                    <div className="data-stat-row">
                      <span className="label">Total Amount</span>
                      <span className={`value ${isLowestPrice ? 'text-success' : ''}`}>
                        {formatCurrency(q.total_amount)}
                        {isLowestPrice && <span className="mini-badge ml-1">Lowest</span>}
                      </span>
                    </div>

                    <div className="data-stat-row">
                      <span className="label">Delivery</span>
                      <span className={`value ${isBestDelivery ? 'text-info' : ''}`}>
                        {q.delivery_days} days
                        {isBestDelivery && <span className="mini-badge mini-badge--info ml-1">Fastest</span>}
                      </span>
                    </div>

                    <div className="data-stat-row">
                      <span className="label">Terms</span>
                      <span className="value">{q.payment_terms || 'Standard'}</span>
                    </div>

                    <div className="data-stat-row">
                      <span className="label">Rating</span>
                      <span className="value">{q.rating ? `${q.rating.toFixed(1)}/5` : 'N/A'}</span>
                    </div>
                  </div>

                  {isInternal && !q.selected && q.status !== 'rejected' && (
                    <div className="data-card__footer">
                      <button className="button button--primary" onClick={() => selectWinner(q.id)}>Select as Winner</button>
                    </div>
                  )}
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
