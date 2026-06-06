import type { ActivityLog } from './types';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function statusTone(status: string) {
  const value = status.toLowerCase();
  if (['approved', 'active', 'selected', 'sent', 'ready', 'open'].includes(value)) return 'success';
  if (['pending', 'draft', 'submitted', 'awaiting'].includes(value)) return 'warning';
  if (['rejected', 'blocked', 'deleted', 'overdue'].includes(value)) return 'danger';
  return 'neutral';
}

export function formatActivity(item: ActivityLog) {
  const meta = item.metadata;
  switch (item.action) {
    case 'rfq.created':
      return `Created RFQ: ${String(meta.title || 'Untitled')}`;
    case 'rfq.vendors.assigned':
      return `Assigned ${String(meta.count || 0)} vendors to RFQ`;
    case 'rfq.line_items.added':
      return `Added ${String(meta.count || 0)} line items to RFQ`;
    case 'quotation.submitted':
      return `Submitted quote for ${formatCurrency(Number(meta.amount || 0))}`;
    case 'quotation.selected':
      return `Selected winning quotation`;
    case 'approval.decided':
      return `${String(meta.status === 'approved' ? 'Approved' : 'Rejected')} at ${String(meta.level)}`;
    case 'purchase_order.created':
      return `Generated PO #${String(meta.po_number)}`;
    case 'invoice.created':
      return `Generated Invoice #${String(meta.invoice_number)}`;
    case 'invoice.sent':
      return `Sent invoice to vendor`;
    case 'vendor.created':
      return `Registered vendor: ${String(meta.name || 'New Vendor')}`;
    case 'user.updated':
      return `Updated user permissions: ${String(meta.role || 'n/a')}`;
    case 'user.deleted':
      return `Deleted user account`;
    case 'user.password_reset':
      return `Reset account password via OTP`;
    default:
      return item.action.replace(/\./g, ' ').replace(/_/g, ' ');
  }
}
