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
import { SettingsPage } from '@/pages/SettingsPage';
import { StaffPage } from '@/pages/StaffPage';
import { SuperAdminPage } from '@/pages/SuperAdminPage';
import { PublicPortalPage } from '@/pages/public/PublicPortalPage';
import { WebsiteHomePage } from '@/pages/website/WebsiteHomePage';
import { WebsiteFeaturesPage } from '@/pages/website/WebsiteFeaturesPage';
import { WebsitePricingPage } from '@/pages/website/WebsitePricingPage';
import { WebsiteAboutPage } from '@/pages/website/WebsiteAboutPage';
import { WebsiteContactPage } from '@/pages/website/WebsiteContactPage';

/**
 * Role allow-lists for route guards.
 * Based on: Sidebar visibility rules + task spec.
 *
 * DONATIONS_SEVAS — everyone except ACCOUNTANT and PRIEST
 * FINANCE         — everyone except COUNTER_STAFF and PRIEST
 * ADMIN_ONLY      — SUPER_ADMIN and ADMIN only
 */
const ROLES_DONATIONS_SEVAS = [
  'SUPER_ADMIN', 'ADMIN', 'COUNTER_STAFF', 'INVENTORY_MANAGER', 'HEAD_PRIEST', 'TRUSTEE',
];

const ROLES_FINANCE = [
  'SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'INVENTORY_MANAGER', 'HEAD_PRIEST', 'TRUSTEE',
];

const ROLES_ADMIN_ONLY = ['ADMIN'];
const ROLES_SUPER_ADMIN_ONLY = ['SUPER_ADMIN'];

/** All temple-scoped roles — explicitly excludes SUPER_ADMIN. */
const ROLES_TEMPLE = [
  'ADMIN', 'ACCOUNTANT', 'COUNTER_STAFF', 'INVENTORY_MANAGER', 'HEAD_PRIEST', 'PRIEST', 'TRUSTEE',
];

/**
 * Application router.
 * Public  routes: /login
 * Protected routes: everything under AppShell (requires authenticated user)
 *
 * Two-layer guards:
 *   1. Outer <ProtectedRoute /> — auth check, handles startup spinner
 *   2. Per-route <ProtectedRoute allowedRoles={[...]}>  — role check
 */
export const router = createBrowserRouter([
  // ── Public marketing pages (no auth required) ─────────────────
  { path: '/',         element: <WebsiteHomePage /> },
  { path: '/features', element: <WebsiteFeaturesPage /> },
  { path: '/pricing',  element: <WebsitePricingPage /> },
  { path: '/about',    element: <WebsiteAboutPage /> },
  { path: '/contact',  element: <WebsiteContactPage /> },

  // ── Auth & portal ─────────────────────────────────────────────
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/portal/:slug',
    element: <PublicPortalPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: 'dashboard',
            element: (
              <ProtectedRoute allowedRoles={ROLES_TEMPLE}>
                <DashboardPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'donations',
            element: (
              <ProtectedRoute allowedRoles={ROLES_DONATIONS_SEVAS}>
                <DonationsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'sevas',
            element: (
              <ProtectedRoute allowedRoles={ROLES_DONATIONS_SEVAS}>
                <SevaBookingsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'devotees',
            element: (
              <ProtectedRoute allowedRoles={ROLES_DONATIONS_SEVAS}>
                <DevoteesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'finance',
            element: (
              <ProtectedRoute allowedRoles={ROLES_FINANCE}>
                <FinancePage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'reports',
            element: (
              <ProtectedRoute allowedRoles={ROLES_FINANCE}>
                <ReportsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'users',
            element: (
              <ProtectedRoute allowedRoles={ROLES_ADMIN_ONLY}>
                <StaffPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'settings',
            element: (
              <ProtectedRoute allowedRoles={ROLES_ADMIN_ONLY}>
                <SettingsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'superadmin',
            element: (
              <ProtectedRoute allowedRoles={ROLES_SUPER_ADMIN_ONLY}>
                <SuperAdminPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
