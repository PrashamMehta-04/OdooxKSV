import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Badge } from '../components/Badge';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusTone } from '../lib/format';
import type { Invoice, QuotationLineItem } from '../lib/types';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<QuotationLineItem[]>([]);

  useEffect(() => {
    void apiFetch<Invoice[]>('/invoices').then(setInvoices);
  }, []);

  async function viewInvoice(invoice: Invoice) {
    const data = await apiFetch<{ invoice: Invoice; items: QuotationLineItem[] }>(`/invoices/${invoice.id}`);
    setSelectedInvoice(data.invoice);
    setItems(data.items);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <div className="no-print">
        <PageHeader eyebrow="PO & Invoice" title="Invoices" description="Print, email, and track due dates." />
        <div className="two-col two-col--wide">
          <SectionCard title="Invoice records" subtitle="Select an invoice to view the document.">
            <div className="data-grid">
              {invoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  className={`data-card stack-list__button ${selectedInvoice?.id === invoice.id ? 'stack-list__button--active' : ''}`}
                  onClick={() => viewInvoice(invoice)}
                >
                  <div className="data-card__header">
                    <div>
                      <strong className="data-card__title">{invoice.invoice_number}</strong>
                      <div className="muted small">Due {formatDate(invoice.due_date)}</div>
                    </div>
                    <Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>
                  </div>
                  <div className="data-card__stats">
                    <div className="data-stat-row">
                      <span className="label">Total</span>
                      <span className="value">{formatCurrency(invoice.grand_total)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Invoice Document" subtitle="Stylized view for review or printing.">
            {selectedInvoice ? (
              <div className="document-actions">
                <button className="button button--ghost" onClick={handlePrint}>Print Invoice</button>
              </div>
            ) : (
              <div className="empty-state">Select an invoice from the list to view.</div>
            )}
          </SectionCard>
        </div>
      </div>

      {selectedInvoice && (
        <div className="print-only-container">
          <div className="document-sheet">
            <div className="document-header">
              <div className="document-brand">
                <div className="brand-mark">VB</div>
                <strong>VendorBridge</strong>
              </div>
              <div className="document-title">
                <h1>INVOICE</h1>
                <span>#{selectedInvoice.invoice_number}</span>
              </div>
            </div>

            <div className="document-meta">
              <div className="meta-box">
                <label>Issue Date</label>
                <strong>{formatDate(selectedInvoice.invoice_date)}</strong>
              </div>
              <div className="meta-box">
                <label>Due Date</label>
                <strong>{formatDate(selectedInvoice.due_date)}</strong>
              </div>
              <div className="meta-box">
                <label>Status</label>
                <strong>{selectedInvoice.status.toUpperCase()}</strong>
              </div>
            </div>

            <table className="document-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="document-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(selectedInvoice.subtotal)}</strong>
              </div>
              <div className="total-row">
                <span>Tax (GST)</span>
                <strong>{formatCurrency(selectedInvoice.gst_amount)}</strong>
              </div>
              <div className="total-row total-row--grand">
                <span>Grand Total</span>
                <strong>{formatCurrency(selectedInvoice.grand_total)}</strong>
              </div>
            </div>

            <div className="document-footer">
              <p>Please remit payment by the due date.</p>
              <p className="muted">Generated by VendorBridge ERP</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

