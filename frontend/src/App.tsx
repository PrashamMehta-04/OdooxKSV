import { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { AuthProvider, useAuth } from './lib/auth';
import { navigate, useRoute } from './lib/router';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { VendorsPage } from './pages/VendorsPage';
import { RFQsPage } from './pages/RFQsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ActivityPage } from './pages/ActivityPage';
import { ReportsPage } from './pages/ReportsPage';
import { VendorSubmissionsPage } from './pages/VendorSubmissionsPage';
import { UsersPage } from './pages/UsersPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AppContent() {
  const route = useRoute();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user && route !== 'login' && route !== 'register') {
      navigate('login');
    }
    if (user && (route === 'login' || route === 'register')) {
      navigate('dashboard');
    }
  }, [ready, route, user]);

  if (!ready) {
    return <div className="boot-screen">Booting VendorBridge…</div>;
  }

  if (!user) {
    return route === 'register' ? <RegisterPage /> : <LoginPage />;
  }

  const content = (() => {
    switch (route) {
      case 'dashboard':
        return <DashboardPage />;
      case 'vendors':
        return <VendorsPage />;
      case 'rfqs':
        return <RFQsPage />;
      case 'quotations':
        return <QuotationsPage />;
      case 'approvals':
        return <ApprovalsPage />;
      case 'purchase-orders':
        return <PurchaseOrdersPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'activity':
        return <ActivityPage />;
      case 'reports':
        return <ReportsPage />;
      case 'vendor-submissions':
        return <VendorSubmissionsPage />;
      case 'users':
        return <UsersPage />;
      case 'forgot-password':
        return <ForgotPasswordPage />;
      case 'reset-password':
        return <ResetPasswordPage />;
      case 'login':
      case 'register':
        return null;
      default:
        return <NotFoundPage />;
    }
  })();

  return (
    <AppShell route={route} onNavigate={navigate}>
      {content}
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

