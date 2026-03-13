import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useDonationSummary,
  useEightyGReport,
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

  const { data, isLoading, isError } = useDonationSummary(from, to);

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

      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <ErrorState />
      ) : !data ? (
        <EmptyState message="No data for this period" />
      ) : (
        <div className="space-y-5">
          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-surface border border-border p-4">
              <p className="text-caption text-text-muted uppercase tracking-wide">Grand Total</p>
              <p className="mt-1 text-h2 font-bold text-success">
                ₹{parseFloat(data.grandTotal).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg bg-surface border border-border p-4">
              <p className="text-caption text-text-muted uppercase tracking-wide">Confirmed Donations</p>
              <p className="mt-1 text-h2 font-bold text-text-primary">{data.confirmedCount}</p>
            </div>
          </div>

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
                {(data.byMode ?? []).map((row) => (
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
                {(data.byCategory ?? []).map((row) => (
                  <tr key={row.categoryId} className="border-b border-border last:border-0">
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
        </div>
      )}
    </div>
  );
}

// ─── 80G Report tab ───────────────────────────────────────────────────────────

function EightyGTab() {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const { data, isLoading, isError } = useEightyGReport(fiscalYear);

  return (
    <div className="space-y-5">
      <div className="w-40">
        <Input
          label="Fiscal Year"
          placeholder="2025-26"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
        />
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
                ₹{parseFloat(data.totalEligibleAmount).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg bg-surface border border-border p-4">
              <p className="text-caption text-text-muted uppercase tracking-wide">Unique Donors</p>
              <p className="mt-1 text-h2 font-bold text-text-primary">{data.donorCount}</p>
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
                {(data.donations ?? []).map((d) => (
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

  const sevaBookings = data?.sevaBookings ?? [];
  const donations    = data?.donations ?? [];

  return (
    <div className="space-y-5">
      <div className="w-40">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <ErrorState />
      ) : sevaBookings.length === 0 && donations.length === 0 ? (
        <EmptyState message="No activity for this date" />
      ) : (
        <div className="space-y-5">
          {/* Totals */}
          {data && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Donations',    value: data.donationTotal, color: 'text-text-primary' },
                { label: 'Seva Bookings', value: data.sevaTotal,    color: 'text-text-primary' },
                { label: 'Grand Total',  value: data.grandTotal,    color: 'text-success'      },
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

          {/* Seva bookings */}
          {sevaBookings.length > 0 && (
            <SectionCard title={`Seva Bookings — ${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}>
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
                  {sevaBookings
                    .slice()
                    .sort((a, b) => (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''))
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

          {/* Donations */}
          {donations.length > 0 && (
            <SectionCard title="Donations">
              <table className="w-full text-body">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Donor</th>
                    <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Mode</th>
                    <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Receipt</th>
                    <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Amount</th>
                    <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="py-2 text-text-primary">{d.donorName}</td>
                      <td className="py-2 text-text-secondary">{d.mode}</td>
                      <td className="py-2 text-caption text-text-muted font-mono">
                        {d.receiptNumber ?? '—'}
                      </td>
                      <td className="py-2 text-right font-semibold text-success">
                        ₹{parseFloat(d.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2">
                        <Badge label={d.status} />
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

// ─── Ledger Report tab ────────────────────────────────────────────────────────

function LedgerReportTab() {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const { data, isLoading, isError } = useLedgerReport(fiscalYear);

  return (
    <div className="space-y-5">
      <div className="w-40">
        <Input
          label="Fiscal Year"
          placeholder="2025-26"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
        />
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <ErrorState />
      ) : !data ? (
        <EmptyState message="No ledger data for this fiscal year" />
      ) : (
        <div className="space-y-5">
          {/* Totals */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Income',  value: data.totalIncome,  color: 'text-success'      },
              { label: 'Total Expense', value: data.totalExpense, color: 'text-danger'        },
              { label: 'Net Balance',   value: data.netBalance,   color: parseFloat(data.netBalance) >= 0 ? 'text-text-primary' : 'text-danger' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-surface border border-border p-4">
                <p className="text-caption text-text-muted uppercase tracking-wide">{label}</p>
                <p className={`mt-1 text-h2 font-bold ${color}`}>
                  ₹{parseFloat(value).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          {/* By fund */}
          {(data.byFund ?? []).length > 0 && (
            <SectionCard title="By Fund">
              <table className="w-full text-body">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-caption text-text-muted font-medium uppercase">Fund</th>
                    <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Income</th>
                    <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Expense</th>
                    <th className="pb-2 text-right text-caption text-text-muted font-medium uppercase">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byFund.map((row) => {
                    const net = parseFloat(row.totalIncome) - parseFloat(row.totalExpense);
                    return (
                      <tr key={row.fundId ?? 'unallocated'} className="border-b border-border last:border-0">
                        <td className="py-2 text-text-primary">
                          {row.fundId ? row.fundId : <span className="text-text-muted italic">Unallocated</span>}
                        </td>
                        <td className="py-2 text-right text-success font-medium">
                          ₹{parseFloat(row.totalIncome).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 text-right text-danger font-medium">
                          ₹{parseFloat(row.totalExpense).toLocaleString('en-IN')}
                        </td>
                        <td className={`py-2 text-right font-semibold ${net >= 0 ? 'text-text-primary' : 'text-danger'}`}>
                          ₹{net.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SectionCard>
          )}
        </div>
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
