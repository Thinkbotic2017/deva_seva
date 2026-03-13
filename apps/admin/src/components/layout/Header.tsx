import { useAuthStore, clearAccessToken } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '@/lib/query-client';
import { apiPost } from '@/lib/api-client';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:       'Super Admin',
  ADMIN:             'Admin',
  ACCOUNTANT:        'Accountant',
  COUNTER_STAFF:     'Counter Staff',
  INVENTORY_MANAGER: 'Inventory Manager',
  HEAD_PRIEST:       'Head Priest',
  PRIEST:            'Priest',
  TRUSTEE:           'Trustee',
};

interface HeaderProps {
  /** Called when the hamburger is clicked — AppShell toggles drawer state */
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, clearUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await apiPost('/auth/logout-all');
    } catch {
      // Best-effort — clear locally regardless
    }
    clearAccessToken();
    clearUser();
    queryClient.clear();
    navigate('/login', { replace: true });
  }

  return (
    <header className="h-14 border-b border-border-subtle bg-bg-surface flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      {/* Left: hamburger (mobile) + temple label */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="lg:hidden p-2 -ml-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface-2 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        <p className="text-caption text-text-muted uppercase tracking-widest font-medium hidden sm:block">
          Temple Admin
        </p>
      </div>

      {/* Right: theme toggle + user info + logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface-2 transition-colors"
        >
          {theme === 'dark' ? (
            /* Sun icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1"  x2="12" y2="3"  />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"   />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1"  y1="12" x2="3"  y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            /* Moon icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-label text-text-primary leading-tight">{user.fullName}</p>
              <p className="text-caption text-text-muted leading-tight">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-primary font-semibold text-sm flex-shrink-0">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => { void handleLogout(); }}
          className="text-caption text-text-muted hover:text-danger-DEFAULT transition-colors px-2 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
