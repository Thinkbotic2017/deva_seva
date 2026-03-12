import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './lib/query-client';
import { router } from './routes/router';
import { setAccessToken, useAuthStore } from './store/auth.store';
import { apiPost } from './lib/api-client';
import './index.css';

interface RefreshResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    role: string;
    templeId: string;
    phone: string;
    email?: string;
  };
}

/**
 * Attempt to restore the session on startup by calling /auth/refresh.
 * The refresh token is stored in an httpOnly cookie — the browser sends it automatically.
 * On success: store access token in memory and hydrate the Zustand user.
 * On failure: leave everything null — ProtectedRoute will redirect to /login.
 */
async function silentRefresh(): Promise<void> {
  const { setUser, setReady } = useAuthStore.getState();

  try {
    const response = await apiPost<RefreshResponse>('/auth/refresh', {});
    setAccessToken(response.accessToken);
    // Map API response shape (id) to AuthUser shape (userId)
    const { id, ...rest } = response.user;
    setUser({ userId: id, ...rest });
  } catch (err) {
    // Refresh token expired or revoked — clear any user that was rehydrated
    // from localStorage so ProtectedRoute correctly redirects to /login.
    console.warn('silentRefresh failed:', err);
    useAuthStore.getState().clearUser();
  } finally {
    setReady();
  }
}

/**
 * Listen for the logout event dispatched by the API interceptor when a
 * token refresh fails mid-session (i.e., the user is kicked out).
 */
window.addEventListener('auth:logout', () => {
  const { clearUser } = useAuthStore.getState();
  clearUser();
  queryClient.clear();
  // RouterProvider is already mounted, so navigate programmatically is not
  // available here — rely on ProtectedRoute to detect user === null and redirect.
});

// Run silent refresh before rendering so ProtectedRoute gets accurate isReady state
silentRefresh().then(() => {
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
