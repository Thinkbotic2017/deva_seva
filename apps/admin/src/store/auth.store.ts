import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  templeId: string;
  role: string;
  /** @deprecated backend no longer returns phone — kept for stored data compatibility */
  phone?: string;
  fullName: string;
}

interface AuthState {
  /** Authenticated user profile. null = not logged in. */
  user: AuthUser | null;
  /** Whether the initial auth check has completed (silentRefresh finished). */
  isReady: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setReady: () => void;
  /**
   * Runs on every page load (Ctrl+R).
   * Reads the stored opaque refresh token, calls POST /auth/refresh, and
   * updates both tokens in storage. Returns true if the session was restored.
   * Always sets isReady: true before returning, whether it succeeds or fails.
   */
  silentRefresh: () => Promise<boolean>;
}

// ─── Access token — in-memory only, never persisted ──────────────────────────
//
// The access token lives only in this module-level variable and is gone on
// every page reload. silentRefresh() re-obtains it from the refresh token.

let _accessToken: string | null = null;

/** Read the in-memory access token. Used by the Axios request interceptor. */
export function getAccessToken(): string | null {
  return _accessToken;
}

/** Store a new access token in memory. Never touches localStorage. */
export function setAccessToken(token: string): void {
  _accessToken = token;
}

/** Clear the in-memory access token (used on logout and auth failure). */
export function clearAccessToken(): void {
  _accessToken = null;
}

// ─── Refresh token — localStorage (survives page reload) ─────────────────────
//
// The opaque refresh token format is {sessionId}.{base64url-secret}.
// It must survive page reloads so silentRefresh() can re-obtain an access token.
// It is NOT stored in the Zustand persist partition to keep concerns separate.

const REFRESH_TOKEN_KEY = 'ds_rt';

/** Read the stored opaque refresh token from localStorage. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Persist the opaque refresh token to localStorage. */
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/** Remove the refresh token from localStorage (logout / auth failure). */
export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─── Zustand store ────────────────────────────────────────────────────────────

/**
 * useAuthStore — Zustand store for auth state visible to components.
 *
 * Holds user identity (role, templeId) but NOT the access token.
 * The access token lives in the module-level _accessToken variable (in-memory).
 * The refresh token lives in localStorage under REFRESH_TOKEN_KEY.
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      isReady: false,

      setUser: (user) => set({ user }),

      clearUser: () => {
        clearAccessToken();
        clearRefreshToken();
        set({ user: null });
      },

      setReady: () => set({ isReady: true }),

      silentRefresh: async () => {
        const storedToken = getRefreshToken();
        if (!storedToken) {
          set({ isReady: true });
          return false;
        }

        try {
          // Use fetch directly — apiClient imports from this file, so importing
          // apiClient here would create a circular module dependency.
          const res = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedToken }),
          });

          if (!res.ok) {
            throw new Error(`Refresh failed: ${res.status}`);
          }

          // Backend wraps all responses in { success: true, data: T, requestId }
          const json = await (res.json() as Promise<{
            success: boolean;
            data: { accessToken: string; refreshToken: string; expiresIn: number };
          }>);

          setAccessToken(json.data.accessToken);
          setRefreshToken(json.data.refreshToken);
          set({ isReady: true });
          return true;
        } catch {
          // Refresh token invalid or expired — clear everything and force re-login
          clearRefreshToken();
          clearAccessToken();
          set({ user: null, isReady: true });
          return false;
        }
      },
    }),
    {
      name: 'devaseva-auth',
      // Only persist user identity — role, templeId, fullName.
      // isReady is intentionally excluded: it must start as false on every page load
      // so silentRefresh() runs to revalidate the session and refill _accessToken.
      // The access token is never persisted. The refresh token is persisted separately.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
