import { useEffect, useState, useRef } from 'react';
import { formatDateTime } from '../lib/format';
import type { AuthUser, Notification } from '../lib/types';
import { apiFetch } from '../lib/api';
import { navigate } from '../lib/router';

export function Topbar({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    try {
      const data = await apiFetch<Notification[]>('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Polling every 60s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isDrawerOpen && drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDrawerOpen]);

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
    setNotifications((prev) =>
      id === 'all'
        ? prev.map((n) => ({ ...n, is_read: true }))
        : prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function handleNotificationClick(n: Notification) {
    console.log('Notification clicked:', n);
    if (!n.is_read) {
      await markRead(n.id);
    }
    setIsDrawerOpen(false);
    if (n.link) {
      console.log('Navigating to:', n.link);
      navigate(n.link as any);
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      {/* Overlay for Drawer */}
      <div className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />
      
      {/* Sliding Notification Drawer */}
      <div className={`notification-drawer ${isDrawerOpen ? 'open' : ''}`} ref={drawerRef}>
        <div className="notification-drawer__header">
          <h3>Notifications</h3>
          <div className="row-actions">
            {unreadCount > 0 && (
              <button className="button button--ghost small" onClick={() => markRead('all')}>
                Mark all read
              </button>
            )}
            <button className="button-icon" onClick={() => setIsDrawerOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
        </div>
        <div className="notification-drawer__list">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`notification-item ${!n.is_read ? 'notification-item--unread' : ''}`}
                style={{ cursor: n.link ? 'pointer' : 'default' }}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="notification-item__content">
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <span className="muted small">{formatDateTime(n.created_at)}</span>
                </div>
                {!n.is_read && (
                  <button 
                    className="button-icon small text-success" 
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(n.id);
                    }} 
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">No notifications yet.</div>
          )}
        </div>
      </div>

      <header className="topbar">
        <div className="topbar__left">
          <button 
            className="topbar-btn mobile-only" 
            onClick={() => document.body.classList.toggle('sidebar-open')}
            aria-label="Toggle Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
          <div className="sidebar__brand mobile-only" style={{ border: 'none', padding: 0, margin: 0 }}>
            <img src="/logo.svg" alt="VB" className="brand-mark" style={{ width: '32px', height: '32px' }} />
            <div>
              <div className="brand-title" style={{ color: 'var(--text)' }}>VendorBridge</div>
              <div className="brand-subtitle" style={{ color: 'var(--muted)' }}>ERP workspace</div>
            </div>
          </div>
        </div>
        <div className="topbar__actions">
          <div className="notification-wrapper">
            <button 
              className="topbar-btn" 
              onClick={(e) => {
                e.stopPropagation();
                setIsDrawerOpen(!isDrawerOpen);
              }}
              aria-label="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
              </svg>
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
          </div>

          <div className="user-profile" onClick={() => navigate('profile')} style={{ cursor: 'pointer' }}>
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
    </>
  );
}


