import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',  label: 'Dashboard',   icon: '⊞' },
  { path: '/donations',  label: 'Donations',   icon: '₹' },
  { path: '/sevas',      label: 'Sevas',        icon: '🪔' },
  { path: '/devotees',   label: 'Devotees',     icon: '🙏' },
  { path: '/finance',    label: 'Finance',      icon: '📊' },
  { path: '/reports',    label: 'Reports',      icon: '📄' },
  { path: '/users',      label: 'Staff',        icon: '👤' },
  { path: '/settings',   label: 'Settings',     icon: '⚙' },
  { path: '/superadmin', label: 'Super Admin',  icon: '🛡' },
];

/** Paths each role is allowed to see in the sidebar. */
const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
  SUPER_ADMIN:       ['/superadmin'],
  ADMIN:             ['/dashboard', '/donations', '/sevas', '/devotees', '/finance', '/reports', '/users', '/settings'],
  ACCOUNTANT:        ['/dashboard', '/finance', '/reports'],
  COUNTER_STAFF:     ['/dashboard', '/donations', '/sevas'],
  PRIEST:            ['/dashboard', '/sevas'],
  HEAD_PRIEST:       ['/dashboard', '/sevas'],
  INVENTORY_MANAGER: ['/dashboard', '/finance', '/reports'],
  TRUSTEE:           ['/dashboard', '/finance', '/reports'],
};

interface SidebarProps {
  /** Mobile drawer: whether the sidebar is visible */
  open?: boolean;
  /** Called when the backdrop or close button is clicked */
  onClose?: () => void;
}

/**
 * Sidebar navigation.
 *
 * Behaviour by breakpoint:
 *   mobile  (<lg)  — off-canvas drawer, slides in when open=true, backdrop overlay
 *   desktop (≥lg)  — always visible, fixed width
 */
export function Sidebar({ open = false, onClose }: SidebarProps) {
  const role = useAuthStore((s) => s.user?.role ?? '');
  const allowedPaths = ROLE_ALLOWED_PATHS[role] ?? ['/dashboard'];
  const visibleItems = NAV_ITEMS.filter((item) => allowedPaths.includes(item.path));

  // Trap focus inside the drawer when open on mobile
  const drawerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) drawerRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* ── Mobile backdrop ────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden',
          'transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* ── Sidebar panel ──────────────────────────────────────────── */}
      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={[
          // Base layout
          'flex flex-col h-screen z-30',
          'bg-bg-surface border-r border-border-subtle',
          // Desktop: static, always visible
          'lg:relative lg:translate-x-0 lg:w-56',
          // Mobile: fixed drawer, slides in/out
          'fixed top-0 left-0 w-72',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo / brand */}
        <div className="flex items-center justify-between gap-2.5 px-5 py-5 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-brand-primary flex items-center justify-center text-text-inverse font-bold text-sm flex-shrink-0">
              DS
            </div>
            <span className="text-h3 font-bold text-text-primary">DevaSeva</span>
          </div>

          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}   // close drawer on mobile after navigation
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2.5 mb-0.5',
                  'text-label transition-colors duration-150',
                  isActive
                    ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                    : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary',
                ].join(' ')
              }
            >
              <span className="w-5 text-center text-base leading-none flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom version tag */}
        <div className="px-5 py-3 border-t border-border-subtle flex-shrink-0">
          <p className="text-caption text-text-muted">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
