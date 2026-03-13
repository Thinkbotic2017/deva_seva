import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

/**
 * AppShell — the main authenticated layout.
 *
 * Layout:
 *   desktop  — Sidebar (fixed left, 14rem) | Header + scrollable main
 *   mobile   — Header with hamburger | Sidebar as off-canvas drawer
 */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bg-page overflow-hidden">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Right panel */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setDrawerOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
