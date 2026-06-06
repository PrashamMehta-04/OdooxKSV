import React, { useState, useEffect, useRef } from 'react';
import { Bell, Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data || []);
      }
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 fixed top-0 right-0 left-0 z-20 ml-[inherit]">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="text-sm text-gray-400 hidden sm:block">
          Welcome back, <span className="font-medium text-gray-700">{user?.name}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-sm text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markOneRead(n.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                        !n.read ? 'bg-primary-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                        )}
                        <div className={!n.read ? '' : 'ml-4'}>
                          <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => {}}
              >
                <User size={14} />
                Profile
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={logout}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
