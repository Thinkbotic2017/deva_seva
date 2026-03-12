import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

// ─── Types matching backend DTOs ──────────────────────────────────────────────

export interface DashboardStats {
  todayDonationCount: number;
  todayDonationTotal: string;
  monthDonationTotal: string;
  pendingSevaCount: number;
  activeDevoteeCount: number;
}

export interface DonationActivity {
  type: 'donation';
  id: string;
  donorName: string;
  amount: string;
  mode: string;
  status: string;
  createdAt: string;
}

export interface SevaActivity {
  type: 'seva_booking';
  id: string;
  devoteeName: string;
  amount: string;
  sevaDate: string;
  status: string;
  createdAt: string;
}

export type ActivityItem = DonationActivity | SevaActivity;

// ─── Query keys ───────────────────────────────────────────────────────────────

export const dashboardKeys = {
  stats: ['dashboard', 'stats'] as const,
  activity: (limit: number) => ['dashboard', 'activity', limit] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the 4 key dashboard stats.
 * Refetches every 60 seconds so the counter/stats page stays fresh.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats,
    queryFn: () => apiGet<DashboardStats>('/dashboard/stats'),
    refetchInterval: 60_000,
  });
}

/**
 * Returns the unified recent activity feed.
 */
export function useDashboardActivity(limit = 20) {
  return useQuery({
    queryKey: dashboardKeys.activity(limit),
    queryFn: () =>
      apiGet<ActivityItem[]>('/dashboard/activity', { limit }),
    refetchInterval: 60_000,
  });
}
