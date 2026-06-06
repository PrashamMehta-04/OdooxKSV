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
  if (['approved', 'active', 'selected', 'sent', 'ready'].includes(value)) return 'success';
  if (['pending', 'draft', 'submitted', 'awaiting'].includes(value)) return 'warning';
  if (['rejected', 'blocked', 'deleted', 'overdue'].includes(value)) return 'danger';
  return 'neutral';
}

