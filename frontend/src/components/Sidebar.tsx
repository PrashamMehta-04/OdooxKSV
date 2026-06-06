import { useAuth } from '../lib/auth';
import type { RouteKey } from '../lib/router';

const items: { key: RouteKey; label: string; description: string; roles?: string[] }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Overview and trends' },
  { key: 'vendors', label: 'Vendors', description: 'Supplier profiles', roles: ['admin', 'officer', 'procurement_head'] },
  { key: 'rfqs', label: 'RFQs', description: 'Requests and line items', roles: ['admin', 'officer', 'procurement_head', 'vendor'] },
  { key: 'quotations', label: 'Quotations', description: 'Compare vendor offers', roles: ['admin', 'officer', 'procurement_head'] },
  { key: 'approvals', label: 'Approvals', description: 'L1/L2 workflow', roles: ['admin', 'procurement_head', 'finance_manager'] },
  { key: 'purchase-orders', label: 'Purchase Orders', description: 'Approved procurement', roles: ['admin', 'officer', 'procurement_head', 'vendor', 'finance_manager'] },
  { key: 'invoices', label: 'Invoices', description: 'Billing and due dates', roles: ['admin', 'officer', 'procurement_head', 'finance_manager'] },
  { key: 'activity', label: 'Activity', description: 'Immutable audit trail', roles: ['admin', 'officer', 'procurement_head', 'finance_manager'] },
  { key: 'reports', label: 'Reports', description: 'Spending insight', roles: ['admin', 'officer', 'procurement_head', 'finance_manager'] },
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
        <div className="brand-mark">VB</div>
        <div>
          <div className="brand-title">VendorBridge</div>
          <div className="brand-subtitle">Procurement ERP</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {filteredItems.map((item) => (
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

