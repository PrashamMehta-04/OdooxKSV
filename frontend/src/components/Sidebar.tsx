import { type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { RouteKey } from '../lib/router';

// Simple SVG Icon helper
function NavIcon({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    'dashboard': <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>,
    'vendors': <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>,
    'rfqs': <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>,
    'quotations': <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM6.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>,
    'approvals': <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>,
    'purchase-orders': <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm12 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM19.5 9.5l1.96 2.5H17V9.5h2.5zM3 13V6h12v7H3z"/>,
    'invoices': <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>,
    'activity': <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>,
    'reports': <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>,
    'vendor-submissions': <path d="M19 15v4H5v-4h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 18.5c-.82 0-1.5-.67-1.5-1.5s.68-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9 5v6l5-3z"/>,
    'users': <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>,
  };
  return (
    <svg className="nav-item__icon" viewBox="0 0 24 24">
      {icons[name] || <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />}
    </svg>
  );
}

const items: { key: RouteKey; label: string; description: string; roles?: string[] }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Overview and trends' },
  { key: 'vendors', label: 'Vendors', description: 'Supplier profiles', roles: ['admin', 'officer', 'procurement_head'] },
  { key: 'rfqs', label: 'RFQs', description: 'Requests and line items', roles: ['admin', 'officer', 'procurement_head', 'vendor'] },
  { key: 'quotations', label: 'Quotations', description: 'Compare vendor offers', roles: ['admin', 'officer', 'procurement_head'] },
  { key: 'approvals', label: 'Approvals', description: 'L1/L2 workflow', roles: ['admin', 'procurement_head', 'finance_manager'] },
  { key: 'purchase-orders', label: 'Purchase Orders', description: 'Approved procurement', roles: ['admin', 'officer', 'procurement_head', 'vendor', 'finance_manager'] },
  { key: 'invoices', label: 'Invoices', description: 'Billing and due dates', roles: ['admin', 'officer', 'procurement_head', 'finance_manager'] },
  { key: 'activity', label: 'Activity', description: 'Immutable audit trail', roles: ['admin', 'officer', 'procurement_head', 'finance_manager'] },
  { key: 'reports', label: 'Reports', description: 'Spending insight', roles: ['admin', 'officer', 'procurement_head', 'finance_manager', 'vendor'] },
  { key: 'vendor-submissions', label: 'Vendor Tasks', description: 'Submit and track quotes', roles: ['vendor'] },
  { key: 'users', label: 'Users', description: 'Manage roles and access', roles: ['admin'] },
];

export function Sidebar({ current, onNavigate }: { current: RouteKey; onNavigate: (route: RouteKey) => void }) {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  const filteredItems = items.filter((item) => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  });

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="/logo.svg" alt="VB" className="brand-mark" />
        <div>
          <div className="brand-title">VendorBridge</div>
          <div className="brand-subtitle">Procurement ERP</div>
        </div>
        <button 
          className="button-icon mobile-only" 
          style={{ marginLeft: 'auto', color: 'white' }}
          onClick={() => document.body.classList.remove('sidebar-open')}
        >
          ×
        </button>
      </div>

      <nav className="sidebar__nav">
        {filteredItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item ${current === item.key ? 'nav-item--active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <NavIcon name={item.key} />
            <div className="nav-item__text">
              <span className="nav-item__label">{item.label}</span>
              <span className="nav-item__description">{item.description}</span>
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}

