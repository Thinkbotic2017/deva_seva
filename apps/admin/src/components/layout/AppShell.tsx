import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

/**
 * AppShell — the main authenticated layout.
 * Sidebar (fixed left) + Header (fixed top) + scrollable main content.
 */
export function AppShell() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      {/* Right panel */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
