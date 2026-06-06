import { formatDateTime } from '../lib/format';
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
      <div>
        <p className="eyebrow">VendorBridge live workspace</p>
        <h2>Welcome back, {user.full_name}</h2>
        <p className="topbar__meta">
          {user.role} · {user.email} · Updated {formatDateTime(user.updated_at)}
        </p>
      </div>
      <div className="topbar__actions">
        <button className="button button--ghost" type="button" onClick={() => window.location.reload()}>
          Refresh
        </button>
        <button className="button button--primary" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

