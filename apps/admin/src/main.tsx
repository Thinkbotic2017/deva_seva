import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './lib/query-client';
import { router } from './routes/router';
import { useAuthStore } from './store/auth.store';
import { initTheme } from './store/theme.store';
import './index.css';

// Apply the stored theme class to <html> before React renders to prevent
// a flash of the wrong theme (FOWT). Must run synchronously before paint.
initTheme();

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

// Run silent refresh before rendering so ProtectedRoute gets accurate isReady state.
// silentRefresh() reads ds_rt from localStorage; if missing it skips the network call
// and sets isReady immediately so the router can redirect to /login without a flash.
useAuthStore.getState().silentRefresh().then(() => {
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
