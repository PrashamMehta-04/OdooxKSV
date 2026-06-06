import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700 ring-green-200',
  warning: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  danger: 'bg-red-100 text-red-700 ring-red-200',
  info: 'bg-blue-100 text-blue-700 ring-blue-200',
  default: 'bg-gray-100 text-gray-600 ring-gray-200',
  purple: 'bg-purple-100 text-purple-700 ring-purple-200',
};

const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export const getStatusBadge = (status: string): React.ReactElement => {
  const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
    // General
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'danger', label: 'Inactive' },
    // RFQ
    draft: { variant: 'default', label: 'Draft' },
    sent: { variant: 'info', label: 'Sent' },
    closed: { variant: 'warning', label: 'Closed' },
    // Quotation
    submitted: { variant: 'info', label: 'Submitted' },
    selected: { variant: 'success', label: 'Selected' },
    rejected: { variant: 'danger', label: 'Rejected' },
    // Approval
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'success', label: 'Approved' },
    // PO
    generated: { variant: 'info', label: 'Generated' },
    acknowledged: { variant: 'purple', label: 'Acknowledged' },
    completed: { variant: 'success', label: 'Completed' },
    // Invoice
    paid: { variant: 'success', label: 'Paid' },
  };

  const config = statusMap[status.toLowerCase()] || { variant: 'default' as BadgeVariant, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default Badge;
