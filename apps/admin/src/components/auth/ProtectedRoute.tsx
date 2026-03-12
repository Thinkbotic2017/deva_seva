import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

/**
 * ProtectedRoute — redirects to /login if the user is not authenticated.
 * isReady prevents a flash of the login page on startup while the
 * silent refresh is in flight.
 */
export function ProtectedRoute() {
  const { user, isReady } = useAuthStore();

  // Show nothing while the initial token refresh is running
  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
