import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarWidth = isCollapsed ? 'ml-16' : 'ml-60';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        userRole={(user?.role || 'vendor') as UserRole}
        isCollapsed={isCollapsed}
      />
      <div className={`${sidebarWidth} transition-all duration-300`}>
        <Header onToggleSidebar={() => setIsCollapsed((v) => !v)} />
        <main className="pt-16 min-h-screen">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
