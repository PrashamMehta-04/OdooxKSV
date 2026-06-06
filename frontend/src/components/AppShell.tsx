import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../lib/auth';
import type { RouteKey } from '../lib/router';

export function AppShell({
  route,
  onNavigate,
  children,
}: {
  route: RouteKey;
  onNavigate: (route: RouteKey) => void;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar current={route} onNavigate={onNavigate} />
      <main className="app-main">
        <Topbar user={user} onLogout={logout} />
        <div className="app-main__content">{children}</div>
      </main>
    </div>
  );
}

