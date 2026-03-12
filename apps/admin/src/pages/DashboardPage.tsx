import { useDashboardStats, useDashboardActivity } from '@/api/dashboard.api';
import { StatCard } from '@/components/ui/StatCard';

/**
 * DashboardPage — live KPI stats + recent activity feed.
 * Stats auto-refresh every 60 seconds via TanStack Query.
 */
export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useDashboardActivity();

  function formatCurrency(amount: string | number | undefined): string {
    if (amount === undefined || amount === null) return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₹0';
    if (num >= 100_000) return `₹${(num / 100_000).toFixed(1)}L`;
    if (num >= 1_000) return `₹${(num / 1_000).toFixed(1)}K`;
    return `₹${num.toFixed(0)}`;
  }

  function formatTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-h1 font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-body text-text-muted">Today's overview</p>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Today's Donations"
          value={statsLoading ? '' : formatCurrency(stats?.todayDonationTotal)}
          sub={statsLoading ? undefined : `${stats?.todayDonationCount ?? 0} transactions`}
          icon="₹"
          iconColor="bg-primary/10 text-primary"
          loading={statsLoading}
        />
        <StatCard
          label="Month to Date"
          value={statsLoading ? '' : formatCurrency(stats?.monthDonationTotal)}
          sub="this month"
          icon="📅"
          iconColor="bg-blue-500/10 text-blue-400"
          loading={statsLoading}
        />
        <StatCard
          label="Pending Sevas"
          value={statsLoading ? '' : (stats?.pendingSevaCount ?? 0)}
          sub="awaiting confirmation"
          icon="🪔"
          iconColor="bg-amber-500/10 text-amber-400"
          loading={statsLoading}
        />
        <StatCard
          label="Active Devotees"
          value={statsLoading ? '' : (stats?.activeDevoteeCount ?? 0)}
          sub="registered"
          icon="🙏"
          iconColor="bg-green-500/10 text-green-400"
          loading={statsLoading}
        />
      </div>

      {/* Recent activity */}
      <div className="rounded-lg bg-surface border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-h3 font-semibold text-text-primary">Recent Activity</h2>
        </div>

        {activityLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-md bg-surface-2 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 bg-surface-2 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-surface-2 rounded animate-pulse" />
                </div>
                <div className="h-3 w-12 bg-surface-2 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="px-5 py-10 text-center text-text-muted text-body">
            No recent activity
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activity.map((item) => (
              <div key={item.id} className="px-5 py-4 flex items-center gap-4 hover:bg-surface-2 transition-colors">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-md flex items-center justify-center text-base flex-shrink-0 ${
                  item.type === 'donation'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {item.type === 'donation' ? '₹' : '🪔'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-label text-text-primary truncate">
                    {item.type === 'donation' ? item.donorName : item.devoteeName}
                  </p>
                  <p className="text-caption text-text-muted truncate">
                    {item.type === 'donation'
                      ? `Donation · ${item.mode}`
                      : `Seva · ${item.sevaDate}`}
                  </p>
                </div>

                {/* Amount / time */}
                <div className="text-right flex-shrink-0">
                  {item.type === 'donation' && (
                    <p className="text-label font-semibold text-text-primary">
                      {formatCurrency(item.amount)}
                    </p>
                  )}
                  <p className="text-caption text-text-muted">{formatTime(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
