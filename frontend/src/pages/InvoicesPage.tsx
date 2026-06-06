import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusTone } from '../lib/format';
import type { Invoice } from '../lib/types';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    void apiFetch<Invoice[]>('/invoices').then(setInvoices);
  }, []);

  return (
    <>
      <PageHeader eyebrow="PO & invoice" title="Invoices" description="Print, email, and track due dates." />
      <SectionCard title="Invoice records" subtitle="Invoice lifecycle generated from approved orders.">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Status</th>
                <th>Grand total</th>
                <th>Issue date</th>
                <th>Due date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoice_number}</strong></td>
                  <td><Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge></td>
                  <td>{formatCurrency(invoice.grand_total)}</td>
                  <td>{formatDate(invoice.invoice_date)}</td>
                  <td>{formatDate(invoice.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

