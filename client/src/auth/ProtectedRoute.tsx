import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "./auth-context";
import { useAuth } from "./auth-context";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
