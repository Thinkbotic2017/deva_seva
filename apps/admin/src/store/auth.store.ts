import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  templeId: string;
  role: string;
  phone: string;
  fullName: string;
}

interface AuthState {
  /** Authenticated user profile. null = not logged in. */
  user: AuthUser | null;
  /** Whether the initial auth check has completed. */
  isReady: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setReady: () => void;
}

// ─── In-memory token storage ──────────────────────────────────────────────────
//
// Security: access token is NEVER written to localStorage or sessionStorage.
// It lives only in this module-level variable. On page refresh it is gone —
// the app must re-authenticate using the refresh token (stored in an
// httpOnly cookie set by the API, not accessible to JS).
//
// The refresh token flow: on startup, the ApiClient calls POST /auth/refresh
// which reads the httpOnly cookie and returns a new access token.

let _accessToken: string | null = null;

/** Read the in-memory access token. Used by the Axios interceptor. */
export function getAccessToken(): string | null {
  return _accessToken;
}

/** Store a new access token in memory. Never touches localStorage. */
export function setAccessToken(token: string): void {
  _accessToken = token;
}

/** Clear the access token (logout). */
export function clearAccessToken(): void {
  _accessToken = null;
}

// ─── Zustand store ────────────────────────────────────────────────────────────

/**
 * useAuthStore — Zustand store for auth state visible to components.
 *
 * Holds user identity (role, templeId) but NOT the access token.
 * The token lives in the module-level variable above — invisible to React.
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      isReady: false,

      setUser: (user) => set({ user }),
      clearUser: () => {
        clearAccessToken();
        set({ user: null });
      },
      setReady: () => set({ isReady: true }),
    }),
    {
      name: 'devaseva-auth',
      // Only persist the user identity — role, templeId, fullName.
      // isReady is intentionally excluded: it must always start as false so
      // silentRefresh() runs on every page load to validate the session
      // server-side and obtain a fresh in-memory access token.
      // The access token itself is never persisted — see the module-level
      // _accessToken variable above.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
