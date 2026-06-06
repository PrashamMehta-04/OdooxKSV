import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { UserRole } from './types';
import { FullPageSpinner } from './components/ui/LoadingSpinner';
import AppLayout from './components/Layout/AppLayout';

// Auth pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Protected pages
import Dashboard from './pages/Dashboard';
import VendorList from './pages/Vendors/VendorList';
import VendorDetail from './pages/Vendors/VendorDetail';
import RFQList from './pages/RFQs/RFQList';
import RFQCreate from './pages/RFQs/RFQCreate';
import RFQDetail from './pages/RFQs/RFQDetail';
import QuotationList from './pages/Quotations/QuotationList';
import QuotationForm from './pages/Quotations/QuotationForm';
import QuotationDetail from './pages/Quotations/QuotationDetail';
import QuotationComparison from './pages/Quotations/QuotationComparison';
import ApprovalList from './pages/Approvals/ApprovalList';
import ApprovalDetail from './pages/Approvals/ApprovalDetail';
import POList from './pages/PurchaseOrders/POList';
import PODetail from './pages/PurchaseOrders/PODetail';
import InvoiceList from './pages/Invoices/InvoiceList';
import InvoiceDetail from './pages/Invoices/InvoiceDetail';
import ActivityLogList from './pages/ActivityLogs/ActivityLogList';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile';

// Role-based access control map
const roleAccess: Record<string, UserRole[]> = {
  '/vendors': ['admin', 'procurement_officer'],
  '/rfqs': ['admin', 'procurement_officer', 'vendor'],
  '/quotations': ['admin', 'procurement_officer', 'vendor', 'manager'],
  '/approvals': ['admin', 'procurement_officer', 'manager'],
  '/purchase-orders': ['admin', 'procurement_officer', 'manager', 'vendor'],
  '/invoices': ['admin', 'procurement_officer', 'manager'],
  '/activity-logs': ['admin'],
  '/reports': ['admin', 'manager'],
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />}
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />

        {/* Vendors */}
        <Route
          path="/vendors"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/vendors'] as UserRole[]}>
              <VendorList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors/:id"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/vendors'] as UserRole[]}>
              <VendorDetail />
            </ProtectedRoute>
          }
        />

        {/* RFQs */}
        <Route
          path="/rfqs"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/rfqs'] as UserRole[]}>
              <RFQList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rfqs/new"
          element={
            <ProtectedRoute requiredRoles={['admin', 'procurement_officer']}>
              <RFQCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rfqs/:id"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/rfqs'] as UserRole[]}>
              <RFQDetail />
            </ProtectedRoute>
          }
        />

        {/* Quotations */}
        <Route
          path="/quotations"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/quotations'] as UserRole[]}>
              <QuotationList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotations/new"
          element={
            <ProtectedRoute requiredRoles={['vendor']}>
              <QuotationForm />
            </ProtectedRoute>
          }
        />
        {/* Note: compare route must be before :id to avoid conflict */}
        <Route
          path="/quotations/compare/:rfqId"
          element={
            <ProtectedRoute requiredRoles={['admin', 'procurement_officer', 'manager']}>
              <QuotationComparison />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotations/:id"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/quotations'] as UserRole[]}>
              <QuotationDetail />
            </ProtectedRoute>
          }
        />

        {/* Approvals */}
        <Route
          path="/approvals"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/approvals'] as UserRole[]}>
              <ApprovalList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals/:id"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/approvals'] as UserRole[]}>
              <ApprovalDetail />
            </ProtectedRoute>
          }
        />

        {/* Purchase Orders */}
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/purchase-orders'] as UserRole[]}>
              <POList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders/:id"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/purchase-orders'] as UserRole[]}>
              <PODetail />
            </ProtectedRoute>
          }
        />

        {/* Invoices */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/invoices'] as UserRole[]}>
              <InvoiceList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/invoices'] as UserRole[]}>
              <InvoiceDetail />
            </ProtectedRoute>
          }
        />

        {/* Activity Logs */}
        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/activity-logs'] as UserRole[]}>
              <ActivityLogList />
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRoles={roleAccess['/reports'] as UserRole[]}>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontSize: '13px',
              borderRadius: '10px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
            success: {
              iconTheme: { primary: '#6366f1', secondary: '#fff' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
