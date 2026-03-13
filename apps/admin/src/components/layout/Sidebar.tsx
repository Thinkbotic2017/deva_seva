import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',  label: 'Dashboard',  icon: '⊞' },
  { path: '/donations',  label: 'Donations',  icon: '₹' },
  { path: '/sevas',      label: 'Sevas',      icon: '🪔' },
  { path: '/devotees',   label: 'Devotees',   icon: '🙏' },
  { path: '/finance',    label: 'Finance',    icon: '📊' },
  { path: '/reports',    label: 'Reports',    icon: '📄' },
  { path: '/users',      label: 'Staff',      icon: '👤' },
  { path: '/settings',   label: 'Settings',   icon: '⚙' },
  { path: '/superadmin', label: 'Super Admin', icon: '🛡' },
];

/** Paths each role is allowed to see. Unlisted roles fall back to dashboard only. */
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

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role ?? '');
  const allowedPaths = ROLE_ALLOWED_PATHS[role] ?? ['/dashboard'];
  const visibleItems = NAV_ITEMS.filter((item) => allowedPaths.includes(item.path));

  return (
    <aside className="w-56 flex-shrink-0 bg-surface border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo / brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-bold text-sm">
          DS
        </div>
        <span className="text-h3 font-bold text-text-primary">DevaSeva</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-md px-3 py-2.5 mb-0.5',
                'text-label transition-colors duration-150',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
              ].join(' ')
            }
          >
            <span className="w-5 text-center text-base leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom version tag */}
      <div className="px-5 py-3 border-t border-border">
        <p className="text-caption text-text-muted">v0.1.0</p>
      </div>
    </aside>
  );
}
