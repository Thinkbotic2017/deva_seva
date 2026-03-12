import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client.
 * - staleTime: 30s — most temple data changes infrequently during a session.
 * - retry: 1 — fail fast for auth errors; let the API handle business logic.
 * - refetchOnWindowFocus: true — staff re-open the tab and expect fresh data.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
