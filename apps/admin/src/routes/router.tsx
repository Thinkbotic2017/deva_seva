import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DonationsPage } from '@/pages/DonationsPage';
import { SevaBookingsPage } from '@/pages/SevaBookingsPage';
import { DevoteesPage } from '@/pages/DevoteesPage';
import { FinancePage } from '@/pages/FinancePage';
import { ReportsPage } from '@/pages/ReportsPage';

/**
 * Application router.
 * Public  routes: /login
 * Protected routes: everything under AppShell (requires authenticated user)
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'donations', element: <DonationsPage /> },
          { path: 'sevas',     element: <SevaBookingsPage /> },
          { path: 'devotees',  element: <DevoteesPage /> },
          { path: 'finance',   element: <FinancePage /> },
          { path: 'reports',   element: <ReportsPage /> },
          // Placeholder stubs for future phases
          { path: 'users',     element: <ComingSoon label="Staff Management" /> },
          { path: 'settings',  element: <ComingSoon label="Settings" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-h2 font-bold text-text-primary">{label}</p>
      <p className="mt-2 text-body text-text-muted">Coming soon</p>
    </div>
  );
}
