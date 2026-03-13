import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { clearAccessToken } from '@/store/auth.store';

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
import { queryClient } from '@/lib/query-client';
import { apiPost } from '@/lib/api-client';

export function Header() {
  const { user, clearUser } = useAuthStore();
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
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 flex-shrink-0">
      {/* Temple name */}
      <div>
        <p className="text-caption text-text-muted uppercase tracking-widest font-medium">
          Temple Admin
        </p>
      </div>

      {/* User menu */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-label text-text-primary leading-tight">{user.fullName}</p>
              <p className="text-caption text-text-muted leading-tight">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <button
          onClick={() => { void handleLogout(); }}
          className="text-caption text-text-muted hover:text-danger transition-colors px-2 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
