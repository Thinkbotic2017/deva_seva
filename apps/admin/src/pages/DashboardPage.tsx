import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, CalendarDays, Flame, Users2,
  TrendingUp, TrendingDown, Scale,
  PlusCircle, BookOpen, UserPlus, CheckCircle,
} from 'lucide-react';
import { useDashboardStats, useDashboardActivity } from '@/api/dashboard.api';
import { useFinanceSummary } from '@/api/finance.api';

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;
  return { from, to };
}

const { from: monthFrom, to: monthTo } = currentMonthRange();

type ActivityTab = 'all' | 'donation' | 'seva_booking';

/**
 * DashboardPage — live KPI stats + finance summary + recent activity feed.
 * Stats auto-refresh every 60 seconds via TanStack Query.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useDashboardActivity(5);
  const { data: finance, isLoading: financeLoading } = useFinanceSummary(monthFrom, monthTo);
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');

  function formatCurrency(amount: string | number | undefined): string {
    if (amount === undefined || amount === null) return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₹0';
    if (num >= 100_000) return `₹${(num / 100_000).toFixed(1)}L`;
    if (num >= 1_000)   return `₹${(num / 1_000).toFixed(1)}K`;
    return `₹${num.toFixed(0)}`;
  }

  function formatTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (diffMins < 1)  return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24)  return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  /** Derive 2-letter initials from a full name. */
  function initials(name: string | undefined): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  const netBalance = finance ? parseFloat(finance.netBalance) : 0;

  const filteredActivity = activity?.filter((item) => {
    if (activityTab === 'all') return true;
    return item.type === activityTab;  // 'donation' | 'seva_booking' — matches backend discriminant
  }) ?? [];

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // Dynamic classes for Net Balance card — computed once, passed as strings
  const balanceBorder = financeLoading ? 'border-l-border-default'
    : netBalance >= 0 ? 'border-l-brand-primary' : 'border-l-danger';
  const balanceIcon = financeLoading ? 'bg-bg-surface-3 text-text-muted'
    : netBalance >= 0 ? 'bg-brand-primary-subtle text-brand-primary' : 'bg-danger-subtle text-danger-fg';

  return (
    <div className="space-y-6">

      {/* ── Page header + Quick Actions ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text-primary">Dashboard</h1>
          <p className="mt-0.5 text-body text-text-muted">{todayLabel}</p>
        </div>

        {/* Quick action pills — desktop only */}
        <div className="hidden sm:flex items-center gap-2">
          <QuickActionButton
            icon={<PlusCircle size={15} />}
            label="New Donation"
            hoverClass="hover:text-brand-primary hover:border-brand-primary/40 hover:bg-brand-primary-subtle"
            onClick={() => navigate('/donations')}
          />
          <QuickActionButton
            icon={<BookOpen size={15} />}
            label="Book Seva"
            hoverClass="hover:text-warning-fg hover:border-warning/40 hover:bg-warning-subtle"
            onClick={() => navigate('/sevas')}
          />
          <QuickActionButton
            icon={<UserPlus size={15} />}
            label="Add Devotee"
            hoverClass="hover:text-success-fg hover:border-success/40 hover:bg-success-subtle"
            onClick={() => navigate('/devotees')}
          />
        </div>
      </div>

      {/* ── KPI stat cards ─────────────────────────────────────────────── */}
      <section aria-label="Today's KPIs">
        <p className="text-caption text-text-muted font-medium uppercase tracking-widest mb-3">Today</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Today's Donations"
            value={statsLoading ? '' : formatCurrency(stats?.todayDonationTotal)}
            sub={statsLoading ? undefined : `${stats?.todayDonationCount ?? 0} transactions`}
            icon={<IndianRupee size={18} />}
            borderColor="border-l-brand-primary"
            iconClass="bg-brand-primary-subtle text-brand-primary"
            loading={statsLoading}
          />
          <KpiCard
            label="Month to Date"
            value={statsLoading ? '' : formatCurrency(stats?.monthDonationTotal)}
            sub="this month"
            icon={<CalendarDays size={18} />}
            borderColor="border-l-info"
            iconClass="bg-info-subtle text-info-fg"
            loading={statsLoading}
          />
          <KpiCard
            label="Pending Sevas"
            value={statsLoading ? '' : String(stats?.pendingSevaCount ?? 0)}
            sub="awaiting confirmation"
            icon={<Flame size={18} />}
            borderColor="border-l-warning"
            iconClass="bg-warning-subtle text-warning-fg"
            loading={statsLoading}
          />
          <KpiCard
            label="Active Devotees"
            value={statsLoading ? '' : String(stats?.activeDevoteeCount ?? 0)}
            sub="registered"
            icon={<Users2 size={18} />}
            borderColor="border-l-success"
            iconClass="bg-success-subtle text-success-fg"
            loading={statsLoading}
          />
        </div>
      </section>

      {/* ── Finance summary — this month ───────────────────────────────── */}
      <section aria-label="Finance this month">
        <p className="text-caption text-text-muted font-medium uppercase tracking-widest mb-3">
          Finance — This Month
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Income"
            value={financeLoading ? '' : formatCurrency(finance?.totalIncome)}
            sub="total receipts"
            icon={<TrendingUp size={18} />}
            borderColor="border-l-success"
            iconClass="bg-success-subtle text-success-fg"
            loading={financeLoading}
          />
          <KpiCard
            label="Expense"
            value={financeLoading ? '' : formatCurrency(finance?.totalExpense)}
            sub="total outflows"
            icon={<TrendingDown size={18} />}
            borderColor="border-l-danger"
            iconClass="bg-danger-subtle text-danger-fg"
            loading={financeLoading}
          />
          <KpiCard
            label="Net Balance"
            value={financeLoading ? '' : formatCurrency(finance?.netBalance)}
            sub="income minus expense"
            icon={<Scale size={18} />}
            borderColor={balanceBorder}
            iconClass={balanceIcon}
            loading={financeLoading}
          />
        </div>
      </section>

      {/* ── Recent activity ────────────────────────────────────────────── */}
      <section
        aria-label="Recent activity"
        className="rounded-xl bg-bg-surface border border-border-subtle overflow-hidden"
      >
        {/* Header + filter tabs */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-h3 font-semibold text-text-primary">Recent Activity</h2>

          <div
            role="tablist"
            aria-label="Filter activity by type"
            className="flex gap-0.5 p-0.5 bg-bg-surface-3 rounded-full border border-border-subtle"
          >
            {(['all', 'donation', 'seva_booking'] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activityTab === tab}
                onClick={() => setActivityTab(tab)}
                className={[
                  'px-3 py-1 rounded-full text-caption font-medium cursor-pointer transition-all duration-150',
                  activityTab === tab
                    ? 'bg-bg-surface text-text-primary shadow-sm border border-border-subtle'
                    : 'text-text-muted hover:text-text-secondary',
                ].join(' ')}
              >
                {tab === 'all' ? 'All' : tab === 'donation' ? 'Donations' : 'Sevas'}
              </button>
            ))}
          </div>
        </div>

        {activityLoading ? (
          <div className="divide-y divide-border-subtle" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-bg-surface-2 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 bg-bg-surface-2 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-bg-surface-2 rounded animate-pulse" />
                </div>
                <div className="h-3 w-12 bg-bg-surface-2 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredActivity.length === 0 ? (
          <div className="px-5 py-12 text-center text-text-muted text-body">
            No {activityTab === 'all' ? '' : activityTab === 'donation' ? 'donation' : 'seva'} activity yet
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredActivity.map((item) => {
              const isDonation = item.type === 'donation';
              const name = isDonation ? item.donorName : item.devoteeName;

              return (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-bg-surface-2 transition-colors"
                >
                  {/* Avatar with initials */}
                  <div
                    aria-hidden="true"
                    className={[
                      'w-9 h-9 rounded-full flex items-center justify-center',
                      'text-caption font-semibold flex-shrink-0 select-none',
                      isDonation
                        ? 'bg-brand-primary-subtle text-brand-primary'
                        : 'bg-warning-subtle text-warning-fg',
                    ].join(' ')}
                  >
                    {initials(name)}
                  </div>

                  {/* Name + detail line */}
                  <div className="flex-1 min-w-0">
                    <p className="text-label text-text-primary truncate">{name}</p>
                    <p className="text-caption text-text-muted flex items-center gap-1">
                      {isDonation ? (
                        <>
                          <IndianRupee size={10} aria-hidden="true" className="shrink-0" />
                          <span>Donation</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.mode}</span>
                        </>
                      ) : (
                        <>
                          <Flame size={10} aria-hidden="true" className="shrink-0" />
                          <span>Seva</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.sevaDate}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Amount + timestamp */}
                  <div className="text-right flex-shrink-0">
                    {isDonation && (
                      <p className="text-label font-semibold text-success-fg flex items-center justify-end gap-0.5">
                        <CheckCircle size={12} aria-hidden="true" className="shrink-0" />
                        {formatCurrency(item.amount)}
                      </p>
                    )}
                    <p className="text-caption text-text-muted">{formatTime(item.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  /** Full Tailwind class for the left border accent, e.g. "border-l-brand-primary" */
  borderColor: string;
  /** Full Tailwind classes for the icon pill, e.g. "bg-success-subtle text-success-fg" */
  iconClass: string;
  loading?: boolean;
}

/**
 * KpiCard — data-dense KPI tile with left-border accent stripe and icon pill.
 * Used exclusively on DashboardPage for at-a-glance metrics.
 */
function KpiCard({ label, value, sub, icon, borderColor, iconClass, loading }: KpiCardProps) {
  return (
    <div
      className={[
        'rounded-xl bg-bg-surface border border-border-subtle border-l-4 p-5',
        'flex items-start gap-4 transition-shadow hover:shadow-card',
        borderColor,
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className={['flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', iconClass].join(' ')}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-caption text-text-secondary font-medium uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-7 w-28 animate-pulse rounded-md bg-bg-surface-2" />
        ) : (
          <p className="mt-0.5 text-h2 font-bold text-text-primary leading-tight truncate">{value}</p>
        )}
        {sub && !loading && (
          <p className="mt-0.5 text-caption text-text-muted">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── QuickActionButton ────────────────────────────────────────────────────────

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  /** Tailwind hover classes for accent colouring, e.g. "hover:text-brand-primary ..." */
  hoverClass: string;
  onClick: () => void;
}

/**
 * QuickActionButton — pill shortcut in the Dashboard header toolbar.
 * Navigates to a module and highlights in that module's accent colour on hover.
 */
function QuickActionButton({ icon, label, hoverClass, onClick }: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 h-9 px-4 rounded-full cursor-pointer select-none',
        'border border-border-default bg-bg-surface',
        'text-text-secondary text-label text-[13px]',
        'transition-all duration-150',
        hoverClass,
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}
