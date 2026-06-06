import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  MessageSquare,
  CheckSquare,
  ShoppingCart,
  Receipt,
  Activity,
  BarChart3,
  Zap,
} from 'lucide-react';
import { UserRole } from '../../types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: <LayoutDashboard size={18} />,
    roles: ['admin', 'procurement_officer', 'vendor', 'manager'],
  },
  {
    label: 'Vendors',
    to: '/vendors',
    icon: <Building2 size={18} />,
    roles: ['admin', 'procurement_officer'],
  },
  {
    label: 'RFQs',
    to: '/rfqs',
    icon: <FileText size={18} />,
    roles: ['admin', 'procurement_officer', 'vendor'],
  },
  {
    label: 'Quotations',
    to: '/quotations',
    icon: <MessageSquare size={18} />,
    roles: ['admin', 'procurement_officer', 'vendor', 'manager'],
  },
  {
    label: 'Approvals',
    to: '/approvals',
    icon: <CheckSquare size={18} />,
    roles: ['admin', 'procurement_officer', 'manager'],
  },
  {
    label: 'Purchase Orders',
    to: '/purchase-orders',
    icon: <ShoppingCart size={18} />,
    roles: ['admin', 'procurement_officer', 'manager'],
  },
  {
    label: 'Invoices',
    to: '/invoices',
    icon: <Receipt size={18} />,
    roles: ['admin', 'procurement_officer', 'manager'],
  },
  {
    label: 'Activity Logs',
    to: '/activity-logs',
    icon: <Activity size={18} />,
    roles: ['admin'],
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: <BarChart3 size={18} />,
    roles: ['admin', 'manager'],
  },
];

interface SidebarProps {
  userRole: UserRole;
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, isCollapsed }) => {
  const location = useLocation();
  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-100 z-30 flex flex-col
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-gray-900 text-sm tracking-tight">VendorBridge</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-150 group
                  ${isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <span className={`shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Role badge */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-gray-100">
          <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 capitalize">
            {userRole.replace('_', ' ')}
          </span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
