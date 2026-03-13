import { useState } from 'react';
import { fmtINR } from '@/lib/format';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import {
  useFinanceLedger, useFinanceSummary, useFinanceCategories,
  useCreateExpense, useCreateIncome,
  type LedgerFilters, type CreateLedgerEntryDto, type LedgerEntry,
} from '@/api/finance.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIST(): string {
  const nowIST = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
  const yyyy = nowIST.getUTCFullYear();
  const mm   = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(nowIST.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function currentMonthRange(): { from: string; to: string } {
  const nowIST = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
  const year  = nowIST.getUTCFullYear();
  const month = nowIST.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay  = new Date(Date.UTC(year, month + 1, 0));
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return { from: fmt(firstDay), to: fmt(lastDay) };
}

const { from: defaultFrom, to: defaultTo } = currentMonthRange();

type EntryFormState = Omit<CreateLedgerEntryDto, 'type'>;

function emptyForm(): EntryFormState {
  return { amount: 0, description: '', entryDate: todayIST() };
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, colorClass, loading,
}: {
  label: string;
  value: string | number | undefined;
  colorClass: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg bg-bg-surface border border-border-subtle p-5">
      <p className="text-caption text-text-secondary uppercase tracking-wide font-medium">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-28 bg-bg-surface-2 rounded animate-pulse" />
      ) : (
        <p className={`mt-1 text-h2 font-bold ${colorClass}`}>
          ₹{fmtINR(value ?? 0)}
        </p>
      )}
    </div>
  );
}

// ─── Entry form ───────────────────────────────────────────────────────────────

function EntryForm({ type, onClose }: { type: 'INCOME' | 'EXPENSE'; onClose: () => void }) {
  const [form, setForm] = useState<EntryFormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof EntryFormState, string>>>({});

  const { data: categories = [] } = useFinanceCategories(type);
  const createExpense = useCreateExpense();
  const createIncome  = useCreateIncome();
  const mutation = type === 'EXPENSE' ? createExpense : createIncome;
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  function setField<K extends keyof EntryFormState>(key: K, value: EntryFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<keyof EntryFormState, string>> = {};
    if (!form.amount || form.amount <= 0) errs.amount = 'Enter a valid amount';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.entryDate) errs.entryDate = 'Entry date is required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const dto: CreateLedgerEntryDto = {
      type,
      amount: form.amount,
      description: form.description.trim(),
      entryDate: form.entryDate,
      ...(form.categoryId ? { categoryId: form.categoryId } : {}),
      ...(form.notes ? { notes: form.notes } : {}),
    };
    mutation.mutate(dto, { onSuccess: () => { setForm(emptyForm()); onClose(); } });
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Amount (₹) *"
          type="number"
          min="1"
          step="0.01"
          value={form.amount || ''}
          onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
          error={errors.amount}
        />
        <Input
          label="Date *"
          type="date"
          value={form.entryDate}
          onChange={(e) => setField('entryDate', e.target.value)}
          error={errors.entryDate}
        />
      </div>

      <Select
        label="Category"
        options={categoryOptions}
        placeholder="No category"
        value={form.categoryId ?? ''}
        onChange={(e) => setField('categoryId', e.target.value || undefined)}
        error={errors.categoryId}
      />

      <Input
        label="Description *"
        placeholder="Brief description"
        value={form.description}
        onChange={(e) => setField('description', e.target.value)}
        error={errors.description}
      />

      {mutation.isError && (
        <p className="text-caption text-danger-DEFAULT">Failed to save. Please try again.</p>
      )}

      <div className="flex gap-3 pt-2 border-t border-border-subtle">
        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          variant={type === 'EXPENSE' ? 'danger' : 'primary'}
          loading={mutation.isPending}
        >
          Add {type === 'EXPENSE' ? 'Expense' : 'Income'}
        </Button>
      </div>
    </form>
  );
}

// ─── Category cell ────────────────────────────────────────────────────────────

function CategoryCell({
  entry,
  categoryMap,
}: {
  entry: LedgerEntry;
  categoryMap: Record<string, { name: string; color?: string }>;
}) {
  if (entry.isAutoPosted) {
    if (entry.donationId) {
      return (
        <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-brand-primary/10 text-brand-primary">
          Donation
        </span>
      );
    }
    if (entry.sevaBookingId) {
      return (
        <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-info-subtle text-info-fg">
          Seva Booking
        </span>
      );
    }
    return <span className="text-text-muted">—</span>;
  }
  if (entry.categoryId && categoryMap[entry.categoryId]) {
    const { name, color } = categoryMap[entry.categoryId]!;
    return (
      <span
        className="px-2 py-0.5 rounded-full text-caption font-medium"
        style={{ backgroundColor: `${color ?? '#6366F1'}20`, color: color ?? '#6366F1' }}
      >
        {name}
      </span>
    );
  }
  return <span className="text-text-muted">—</span>;
}

// ─── Mobile ledger row card ───────────────────────────────────────────────────

function LedgerCard({
  entry,
  categoryMap,
}: {
  entry: LedgerEntry;
  categoryMap: Record<string, { name: string; color?: string }>;
}) {
  return (
    <div className="p-4 border-b border-border-subtle last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-label text-text-primary truncate">{entry.description}</p>
          {entry.isAutoPosted && (
            <p className="text-caption text-text-muted">Auto-posted</p>
          )}
        </div>
        <span className={`text-label font-semibold flex-shrink-0 ${
          entry.type === 'INCOME' ? 'text-success-DEFAULT' : 'text-danger-DEFAULT'
        }`}>
          {entry.type === 'EXPENSE' ? '−' : '+'}₹{fmtINR(entry.amount)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <Badge label={entry.type} variant={entry.type === 'INCOME' ? 'success' : 'danger'} />
        <CategoryCell entry={entry} categoryMap={categoryMap} />
        <span className="text-caption text-text-muted">{formatDateString(entry.entryDate)}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalType = 'INCOME' | 'EXPENSE' | null;
type SourceFilter = '' | 'manual' | 'donation' | 'seva';

export function FinancePage() {
  const [filters, setFilters] = useState<LedgerFilters>({
    page: 1, limit: 20, fromDate: defaultFrom, toDate: defaultTo,
  });
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('');

  const { data, isLoading, isError } = useFinanceLedger(filters);
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(
    filters.fromDate ?? defaultFrom,
    filters.toDate ?? defaultTo,
  );
  const { data: incomeCategories  = [] } = useFinanceCategories('INCOME');
  const { data: expenseCategories = [] } = useFinanceCategories('EXPENSE');

  const categoryMap: Record<string, { name: string; color?: string }> = {};
  for (const c of incomeCategories)  categoryMap[c.id] = { name: c.name, color: c.color };
  for (const c of expenseCategories) categoryMap[c.id] = { name: c.name, color: c.color };

  const allRows = data?.data ?? [];
  const filteredRows = sourceFilter === ''
    ? allRows
    : allRows.filter((e) => {
        if (sourceFilter === 'manual')   return !e.isAutoPosted;
        if (sourceFilter === 'donation') return Boolean(e.donationId);
        if (sourceFilter === 'seva')     return Boolean(e.sevaBookingId);
        return true;
      });

  const meta = data?.meta;
  const netBalance = summary ? parseFloat(summary.netBalance) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-h1 font-bold text-text-primary">Finance</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpenModal('INCOME')}>
            + Income
          </Button>
          <Button variant="danger" onClick={() => setOpenModal('EXPENSE')}>
            + Expense
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Income"
          value={summary?.totalIncome}
          colorClass="text-success-DEFAULT"
          loading={summaryLoading}
        />
        <SummaryCard
          label="Total Expense"
          value={summary?.totalExpense}
          colorClass="text-danger-DEFAULT"
          loading={summaryLoading}
        />
        <SummaryCard
          label="Net Balance"
          value={summary?.netBalance}
          colorClass={netBalance >= 0 ? 'text-text-primary' : 'text-danger-DEFAULT'}
          loading={summaryLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg bg-bg-surface border border-border-subtle p-4">
        <div className="flex-1 min-w-[140px]">
          <Input
            label="From date"
            type="date"
            value={filters.fromDate ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, fromDate: e.target.value || undefined, page: 1 }))
            }
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Input
            label="To date"
            type="date"
            value={filters.toDate ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, toDate: e.target.value || undefined, page: 1 }))
            }
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Type"
            options={[
              { value: 'INCOME',  label: 'Income'  },
              { value: 'EXPENSE', label: 'Expense' },
            ]}
            placeholder="All types"
            value={filters.type ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                type: (e.target.value as 'INCOME' | 'EXPENSE') || undefined,
                page: 1,
              }))
            }
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Source"
            options={[
              { value: 'manual',   label: 'Manual'       },
              { value: 'donation', label: 'Donation'     },
              { value: 'seva',     label: 'Seva Booking' },
            ]}
            placeholder="All sources"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
          />
        </div>
      </div>

      {/* Ledger */}
      <div className="rounded-lg bg-bg-surface border border-border-subtle overflow-hidden">

        {/* ── Desktop table ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-surface-2">
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-right text-caption text-text-muted font-medium uppercase tracking-wide">Amount</th>
              </tr>
            </thead>

            {isLoading ? (
              <tbody><TableSkeleton rows={8} columns={5} /></tbody>
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-danger-DEFAULT text-body">
                    Failed to load ledger. Please try again.
                  </td>
                </tr>
              </tbody>
            ) : filteredRows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-text-muted text-body">
                    No entries found for this period
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {filteredRows.map((entry) => (
                  <tr key={entry.id} className="border-b border-border-subtle hover:bg-bg-surface-2 transition-colors">
                    <td className="px-4 py-3 text-caption text-text-muted whitespace-nowrap">
                      {formatDateString(entry.entryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body text-text-primary">{entry.description}</p>
                      {entry.isAutoPosted && (
                        <span className="text-caption text-text-muted">Auto-posted</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryCell entry={entry} categoryMap={categoryMap} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={entry.type}
                        variant={entry.type === 'INCOME' ? 'success' : 'danger'}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-label font-semibold ${
                        entry.type === 'INCOME' ? 'text-success-DEFAULT' : 'text-danger-DEFAULT'
                      }`}>
                        {entry.type === 'EXPENSE' ? '−' : '+'}₹{fmtINR(entry.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="divide-y divide-border-subtle">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`skeleton-card-${i}`} className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-40 bg-bg-surface-2 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-bg-surface-2 rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-24 bg-bg-surface-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="px-4 py-12 text-center text-danger-DEFAULT text-body">
              Failed to load ledger. Please try again.
            </p>
          ) : filteredRows.length === 0 ? (
            <p className="px-4 py-12 text-center text-text-muted text-body">
              No entries found for this period
            </p>
          ) : (
            filteredRows.map((entry) => (
              <LedgerCard key={entry.id} entry={entry} categoryMap={categoryMap} />
            ))
          )}
        </div>

        {meta && (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          />
        )}
      </div>

      {/* Income modal */}
      <Modal isOpen={openModal === 'INCOME'} onClose={() => setOpenModal(null)} title="Add Income Entry">
        <EntryForm key={openModal === 'INCOME' ? 'income-open' : 'income-closed'} type="INCOME" onClose={() => setOpenModal(null)} />
      </Modal>

      {/* Expense modal */}
      <Modal isOpen={openModal === 'EXPENSE'} onClose={() => setOpenModal(null)} title="Add Expense Entry">
        <EntryForm key={openModal === 'EXPENSE' ? 'expense-open' : 'expense-closed'} type="EXPENSE" onClose={() => setOpenModal(null)} />
      </Modal>
    </div>
  );
}
