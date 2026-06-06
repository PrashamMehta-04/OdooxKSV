import type { RouteKey } from '../lib/router';

const items: { key: RouteKey; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Overview and trends' },
  { key: 'vendors', label: 'Vendors', description: 'Supplier profiles' },
  { key: 'rfqs', label: 'RFQs', description: 'Requests and line items' },
  { key: 'quotations', label: 'Quotations', description: 'Compare vendor offers' },
  { key: 'approvals', label: 'Approvals', description: 'L1/L2 workflow' },
  { key: 'purchase-orders', label: 'Purchase Orders', description: 'Approved procurement' },
  { key: 'invoices', label: 'Invoices', description: 'Billing and due dates' },
  { key: 'activity', label: 'Activity', description: 'Immutable audit trail' },
  { key: 'reports', label: 'Reports', description: 'Spending insight' },
];

export function Sidebar({ current, onNavigate }: { current: RouteKey; onNavigate: (route: RouteKey) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand-mark">VB</div>
        <div>
          <div className="brand-title">VendorBridge</div>
          <div className="brand-subtitle">Procurement ERP</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item ${current === item.key ? 'nav-item--active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-item__label">{item.label}</span>
            <span className="nav-item__description">{item.description}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <p className="sidebar__note">Screen set from the Excalidraw flow.</p>
      </div>
    </aside>
  );
}

