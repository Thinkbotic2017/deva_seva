import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import {
  useFinanceLedger, useFinanceSummary, useFinanceCategories,
  useCreateExpense, useCreateIncome,
  type LedgerFilters, type CreateLedgerEntryDto,
} from '@/api/finance.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the first and last day of the current calendar month. */
function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { from, to };
}

const today = new Date().toISOString().split('T')[0];
const { from: defaultFrom, to: defaultTo } = currentMonthRange();

const EMPTY_FORM: CreateLedgerEntryDto = {
  amount: 0,
  categoryId: '',
  description: '',
  entryDate: today,
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-surface-2 rounded animate-pulse" style={{ width: `${55 + (j * 15) % 45}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, color, loading,
}: {
  label: string;
  value: string | number | undefined;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface border border-border p-5">
      <p className="text-caption text-text-secondary uppercase tracking-wide font-medium">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-28 bg-surface-2 rounded animate-pulse" />
      ) : (
        <p className={`mt-1 text-h2 font-bold ${color}`}>
          ₹{typeof value === 'string'
              ? parseFloat(value).toLocaleString('en-IN')
              : (value ?? 0).toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}

// ─── Entry form (shared for income and expense) ───────────────────────────────

function EntryForm({
  type,
  onClose,
}: {
  type: 'INCOME' | 'EXPENSE';
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateLedgerEntryDto>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateLedgerEntryDto, string>>>({});

  const { data: categories = [] } = useFinanceCategories(type);
  const createExpense = useCreateExpense();
  const createIncome  = useCreateIncome();
  const mutation = type === 'EXPENSE' ? createExpense : createIncome;

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  function setField<K extends keyof CreateLedgerEntryDto>(key: K, value: CreateLedgerEntryDto[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<keyof CreateLedgerEntryDto, string>> = {};
    if (!form.amount || form.amount <= 0) errs.amount = 'Enter a valid amount';
    if (!form.categoryId) errs.categoryId = 'Select a category';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.entryDate) errs.entryDate = 'Entry date is required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    mutation.mutate(form, {
      onSuccess: () => {
        setForm(EMPTY_FORM);
        onClose();
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
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
        label="Category *"
        options={categoryOptions}
        placeholder="Select category"
        value={form.categoryId}
        onChange={(e) => setField('categoryId', e.target.value)}
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
        <p className="text-caption text-danger">Failed to save. Please try again.</p>
      )}

      <div className="flex gap-3 pt-2 border-t border-border">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalType = 'INCOME' | 'EXPENSE' | null;

export function FinancePage() {
  const [filters, setFilters] = useState<LedgerFilters>({
    page: 1, limit: 20, fromDate: defaultFrom, toDate: defaultTo,
  });
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const { data, isLoading, isError } = useFinanceLedger(filters);
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(
    filters.fromDate ?? defaultFrom,
    filters.toDate ?? defaultTo,
  );

  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          color="text-success"
          loading={summaryLoading}
        />
        <SummaryCard
          label="Total Expense"
          value={summary?.totalExpense}
          color="text-danger"
          loading={summaryLoading}
        />
        <SummaryCard
          label="Net Balance"
          value={summary?.netBalance}
          color={
            summary && parseFloat(summary.netBalance) >= 0
              ? 'text-text-primary'
              : 'text-danger'
          }
          loading={summaryLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg bg-surface border border-border p-4">
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
      </div>

      {/* Ledger table */}
      <div className="rounded-lg bg-surface border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-right text-caption text-text-muted font-medium uppercase tracking-wide">Amount</th>
              </tr>
            </thead>

            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-danger text-body">
                    Failed to load ledger. Please try again.
                  </td>
                </tr>
              </tbody>
            ) : !data?.data.length ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-text-muted text-body">
                    No entries found for this period
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {data.data.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 text-caption text-text-muted whitespace-nowrap">
                      {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body text-text-primary">{entry.description}</p>
                      {entry.isAutoPosted && (
                        <span className="text-caption text-text-muted">Auto-posted</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-body text-text-secondary">
                      {entry.category?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={entry.type}
                        variant={entry.type === 'INCOME' ? 'success' : 'danger'}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-label font-semibold ${
                        entry.type === 'INCOME' ? 'text-success' : 'text-danger'
                      }`}>
                        {entry.type === 'EXPENSE' ? '−' : '+'}₹{parseFloat(entry.amount).toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
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
      <Modal
        isOpen={openModal === 'INCOME'}
        onClose={() => setOpenModal(null)}
        title="Add Income Entry"
      >
        <EntryForm type="INCOME" onClose={() => setOpenModal(null)} />
      </Modal>

      {/* Expense modal */}
      <Modal
        isOpen={openModal === 'EXPENSE'}
        onClose={() => setOpenModal(null)}
        title="Add Expense Entry"
      >
        <EntryForm type="EXPENSE" onClose={() => setOpenModal(null)} />
      </Modal>
    </div>
  );
}
