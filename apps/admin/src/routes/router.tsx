import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';

/**
 * Application router.
 * Public routes: /login
 * Protected routes: everything under AppShell (requires authenticated user)
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // ProtectedRoute handles the isReady spinner + redirect to /login
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          // Placeholder routes — pages to be built in subsequent phases
          { path: 'donations', element: <ComingSoon label="Donations" /> },
          { path: 'sevas',     element: <ComingSoon label="Sevas" /> },
          { path: 'devotees',  element: <ComingSoon label="Devotees" /> },
          { path: 'finance',   element: <ComingSoon label="Finance" /> },
          { path: 'reports',   element: <ComingSoon label="Reports" /> },
          { path: 'users',     element: <ComingSoon label="Staff" /> },
          { path: 'settings',  element: <ComingSoon label="Settings" /> },
        ],
      },
    ],
  },
  // Fallback — redirect unknown paths to dashboard
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-h2 font-bold text-text-primary">{label}</p>
      <p className="mt-2 text-body text-text-muted">Coming soon in the next phase</p>
    </div>
  );
}
