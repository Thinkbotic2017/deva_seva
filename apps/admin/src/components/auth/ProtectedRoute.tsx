import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  /**
   * When provided, the user's role must be in this list or they are redirected
   * to /dashboard. Used to wrap individual page elements in the router.
   */
  allowedRoles?: string[];
  /**
   * Page element to render when role check passes.
   * When omitted the component acts as a layout route and renders <Outlet />.
   */
  children?: ReactNode;
}

/**
 * ProtectedRoute — two-mode auth/role guard.
 *
 * Mode 1 — auth wrapper (no allowedRoles, no children):
 *   Used as a layout route in the router. Shows a spinner while the initial
 *   silent refresh is in flight, then redirects to /login if no user.
 *
 * Mode 2 — role guard (allowedRoles + children):
 *   Wraps a single page element. Redirects to /dashboard if the user's role
 *   is not in the allowedRoles list. Skips the spinner (auth is already
 *   confirmed by the outer Mode 1 wrapper).
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isReady } = useAuthStore();
  const { pathname } = useLocation();

  // Only block on isReady for the outer auth wrapper (Mode 1).
  // By the time Mode 2 role guards render, isReady is always true.
  if (!allowedRoles && !isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // SUPER_ADMIN has no temple — always send them to /superadmin.
  if (user.role === 'SUPER_ADMIN' && !pathname.startsWith('/superadmin')) {
    return <Navigate to="/superadmin" replace />;
  }

  // Temple-scoped roles must never reach /superadmin.
  if (user.role !== 'SUPER_ADMIN' && pathname.startsWith('/superadmin')) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
