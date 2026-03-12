import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useDonationAnalytics,
  useEightyGSummary,
  useDaySheet,
  useLedgerReport,
} from '@/api/reports.api';

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'donation-summary' | '80g-report' | 'day-sheet' | 'ledger-report';

const TABS: { id: Tab; label: string }[] = [
  { id: 'donation-summary', label: 'Donation Summary' },
  { id: '80g-report',       label: '80G Report'       },
  { id: 'day-sheet',        label: 'Day Sheet'        },
  { id: 'ledger-report',    label: 'Ledger Report'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Current fiscal year string: '2025-26' */
function currentFiscalYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(year + 1).slice(-2)}`;
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { from, to };
}

const today = new Date().toISOString().split('T')[0];
const { from: defaultFrom, to: defaultTo } = currentMonthRange();

// ─── Donation Summary tab ─────────────────────────────────────────────────────

function DonationSummaryTab() {
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(defaultTo);

  const { data, isLoading, isError } = useDonationAnalytics(from, to);

  return (
    <div className="space-y-5">
      {/* Date range */}
      <div className="flex gap-3">
        <div className="w-40">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <ErrorState />
      ) : !data ? (
        <EmptyState message="No data for this period" />
      ) : (
        <div className="space-y-5">
          {/* By mode */}
          <SectionCard title="By Payment Mode">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Mode</th>
                  <th className="pb-2 text-center text-caption text-text-muted font-medium uppercase">Count</th>
                  <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byMode.map((row) => (
                  <tr key={row.mode} className="border-b border-border last:border-0">
                    <td className="py-2 text-text-primary">{row.mode}</td>
                    <td className="py-2 text-center text-text-secondary">{row.count}</td>
                    <td className="py-2 text-right font-semibold text-text-primary">
                      ₹{parseFloat(row.total).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          {/* By category */}
          <SectionCard title="By Category">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Category</th>
                  <th className="pb-2 text-center text-caption text-text-muted font-medium uppercase">Count</th>
                  <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byCategory.map((row) => (
                  <tr key={row.categoryName} className="border-b border-border last:border-0">
                    <td className="py-2 text-text-primary">{row.categoryName}</td>
                    <td className="py-2 text-center text-text-secondary">{row.count}</td>
                    <td className="py-2 text-right font-semibold text-text-primary">
                      ₹{parseFloat(row.total).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          {/* Top donors */}
          {data.topDonors.length > 0 && (
            <SectionCard title="Top Donors">
              <table className="w-full text-body">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">#</th>
                    <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Name</th>
                    <th className="pb-2 text-center text-caption text-text-muted font-medium uppercase">Txns</th>
                    <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDonors.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 text-caption text-text-muted w-6">{i + 1}</td>
                      <td className="py-2 text-text-primary">{row.donorName}</td>
                      <td className="py-2 text-center text-text-secondary">{row.count}</td>
                      <td className="py-2 text-right font-semibold text-text-primary">
                        ₹{parseFloat(row.total).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 80G Report tab ───────────────────────────────────────────────────────────

function EightyGTab() {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const { data, isLoading, isError } = useEightyGSummary(fiscalYear);

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3">
        <div className="w-40">
          <Input
            label="Fiscal Year"
            placeholder="2025-26"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
          />
        </div>
        {data?.downloadUrl && (
          <Button
            variant="secondary"
            onClick={() => window.open(data.downloadUrl!, '_blank')}
          >
            Download PDF
          </Button>
        )}
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <ErrorState />
      ) : !data ? (
        <EmptyState message="No 80G data for this fiscal year" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-surface border border-border p-4">
              <p className="text-caption text-text-muted uppercase tracking-wide">80G Eligible Total</p>
              <p className="mt-1 text-h2 font-bold text-text-primary">
                ₹{parseFloat(data.totalEligible).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg bg-surface border border-border p-4">
              <p className="text-caption text-text-muted uppercase tracking-wide">Unique Donors</p>
              <p className="mt-1 text-h2 font-bold text-text-primary">{data.donorsCount}</p>
            </div>
          </div>

          <SectionCard title={`80G Donations — ${fiscalYear}`}>
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Donor</th>
                  <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">PAN</th>
                  <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Date</th>
                  <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.donations.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-text-primary">{d.donorName}</td>
                    <td className="py-2 text-caption text-text-muted font-mono">
                      {d.donorPanMasked ?? '—'}
                    </td>
                    <td className="py-2 text-text-secondary">
                      {new Date(d.paymentDate).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="py-2 text-right font-semibold text-text-primary">
                      ₹{parseFloat(d.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

// ─── Day Sheet tab ────────────────────────────────────────────────────────────

function DaySheetTab() {
  const [date, setDate] = useState(today);
  const { data, isLoading, isError } = useDaySheet(date);

  return (
    <div className="space-y-5">
      <div className="w-40">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <ErrorState />
      ) : !data?.bookings.length ? (
        <EmptyState message="No seva bookings for this date" />
      ) : (
        <SectionCard title={`Sevas on ${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}>
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Time</th>
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Seva</th>
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Devotee</th>
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Sankalpa</th>
                <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Amount</th>
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings
                .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                .map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-label font-medium text-text-primary">{b.timeSlot}</td>
                    <td className="py-2 text-text-primary">{b.sevaType?.name ?? '—'}</td>
                    <td className="py-2">
                      <p className="text-text-primary">{b.devoteeName}</p>
                      {b.devoteePhone && (
                        <p className="text-caption text-text-muted">{b.devoteePhone}</p>
                      )}
                    </td>
                    <td className="py-2 text-text-secondary">{b.sankalpaName ?? '—'}</td>
                    <td className="py-2 text-right font-semibold text-text-primary">
                      ₹{parseFloat(b.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2">
                      <Badge label={b.status} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Ledger Report tab ────────────────────────────────────────────────────────

function LedgerReportTab() {
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(defaultTo);

  const { data, isLoading, isError } = useLedgerReport(from, to);
  const entries = (data as { entries?: ReturnType<typeof useLedgerReport>['data'] } | undefined)?.entries
    // The endpoint returns PaginatedResult — handle both shapes
    ?? (data as { data?: unknown[] } | undefined)?.data
    ?? [];

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="w-40">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Income',  value: (data as { totalIncome?: string }).totalIncome ?? '0', color: 'text-success' },
            { label: 'Total Expense', value: (data as { totalExpense?: string }).totalExpense ?? '0', color: 'text-danger' },
            { label: 'Net',           value: (data as { net?: string }).net ?? '0', color: 'text-text-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-surface border border-border p-4">
              <p className="text-caption text-text-muted uppercase tracking-wide">{label}</p>
              <p className={`mt-1 text-h2 font-bold ${color}`}>
                ₹{parseFloat(value).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <ErrorState />
      ) : !Array.isArray(entries) || entries.length === 0 ? (
        <EmptyState message="No ledger entries for this period" />
      ) : (
        <SectionCard title="Ledger Entries">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Date</th>
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Description</th>
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Category</th>
                <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Type</th>
                <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(entries as Array<{ id: string; entryDate: string; description: string; category?: { name: string }; type: string; amount: string }>).map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="py-2 text-text-secondary whitespace-nowrap">
                    {new Date(e.entryDate).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short',
                    })}
                  </td>
                  <td className="py-2 text-text-primary">{e.description}</td>
                  <td className="py-2 text-text-secondary">{e.category?.name ?? '—'}</td>
                  <td className="py-2">
                    <Badge label={e.type} variant={e.type === 'INCOME' ? 'success' : 'danger'} />
                  </td>
                  <td className="py-2 text-right">
                    <span className={`font-semibold ${e.type === 'INCOME' ? 'text-success' : 'text-danger'}`}>
                      {e.type === 'EXPENSE' ? '−' : '+'}₹{parseFloat(e.amount).toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-surface-2">
        <h3 className="text-label font-semibold text-text-secondary uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="rounded-lg bg-surface border border-border p-5 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-5 bg-surface-2 rounded animate-pulse" style={{ width: `${50 + (i * 17) % 50}%` }} />
      ))}
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-lg bg-surface border border-border p-8 text-center text-danger text-body">
      Failed to load report data. Please try again.
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-surface border border-border p-10 text-center text-text-muted text-body">
      {message}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('donation-summary');

  return (
    <div className="space-y-5">
      <h1 className="text-h1 font-bold text-text-primary">Reports</h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-surface border border-border p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 h-9 rounded-md text-label transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'donation-summary' && <DonationSummaryTab />}
        {activeTab === '80g-report'       && <EightyGTab />}
        {activeTab === 'day-sheet'        && <DaySheetTab />}
        {activeTab === 'ledger-report'    && <LedgerReportTab />}
      </div>
    </div>
  );
}
