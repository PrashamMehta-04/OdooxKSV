import type { AuthUser } from '../lib/types';

export function Topbar({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div className="sidebar__brand" style={{ border: 'none', padding: 0, margin: 0 }}>
        <img src="/logo.svg" alt="VB" className="brand-mark" style={{ width: '32px', height: '32px' }} />
        <div>
          <div className="brand-title" style={{ color: 'var(--text)' }}>VendorBridge</div>
          <div className="brand-subtitle" style={{ color: 'var(--muted)' }}>ERP workspace</div>
        </div>
      </div>
      
      <div className="topbar__actions">
        <div className="user-profile">
          <div className="user-avatar">{user.full_name.charAt(0)}</div>
          <div className="user-info">
            <span className="user-name">{user.full_name}</span>
            <span className="user-role">{user.role}</span>
          </div>
        </div>
        <button className="button button--ghost" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

