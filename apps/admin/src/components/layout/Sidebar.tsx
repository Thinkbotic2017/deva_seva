import { NavLink } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard',  icon: '⊞' },
  { path: '/donations', label: 'Donations',  icon: '₹' },
  { path: '/sevas',     label: 'Sevas',      icon: '🪔' },
  { path: '/devotees',  label: 'Devotees',   icon: '🙏' },
  { path: '/finance',   label: 'Finance',    icon: '📊' },
  { path: '/reports',   label: 'Reports',    icon: '📄' },
  { path: '/users',     label: 'Staff',      icon: '👤' },
  { path: '/settings',  label: 'Settings',   icon: '⚙' },
];

export function Sidebar() {
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
        {NAV_ITEMS.map((item) => (
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
