import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusTone } from '../lib/format';
import type { PurchaseOrder } from '../lib/types';

export function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    void apiFetch<PurchaseOrder[]>('/purchase-orders').then(setPos);
  }, []);

  return (
    <>
      <PageHeader eyebrow="PO & invoice" title="Purchase orders" description="Approved procurement converted into PO records." />
      <SectionCard title="Purchase orders" subtitle="Auto-generated after final approval.">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Status</th>
                <th>Subtotal</th>
                <th>GST</th>
                <th>Grand total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po.id}>
                  <td><strong>{po.po_number}</strong></td>
                  <td><Badge tone={statusTone(po.status)}>{po.status}</Badge></td>
                  <td>{formatCurrency(po.subtotal)}</td>
                  <td>{formatCurrency(po.gst_amount)}</td>
                  <td>{formatCurrency(po.grand_total)}</td>
                  <td>{formatDate(po.po_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

