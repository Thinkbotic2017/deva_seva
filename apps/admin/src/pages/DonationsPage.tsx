import { useState, useRef } from 'react';
import {
  PlusCircle, SlidersHorizontal, Search,
  ChevronsUpDown, X, CheckCircle, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import {
  useDonations, useDonationCategories, useCreateDonation,
  type DonationFilters, type CreateDonationDto,
} from '@/api/donations.api';
import { apiGet, apiPost, apiPatch } from '@/lib/api-client';
import { fmtINR } from '@/lib/format';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import type { DevoteeDetail } from '@/api/devotees.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_OPTIONS = [
  { value: 'CASH',   label: 'Cash'   },
  { value: 'UPI',    label: 'UPI'    },
  { value: 'CARD',   label: 'Card'   },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'NEFT',   label: 'NEFT'   },
  { value: 'DD',     label: 'DD'     },
];

const STATUS_OPTIONS = [
  { value: 'PENDING',           label: 'Pending'           },
  { value: 'CONFIRMED',         label: 'Confirmed'         },
  { value: 'RECEIPT_GENERATED', label: 'Receipt Generated' },
  { value: 'RECEIPT_SENT',      label: 'Receipt Sent'      },
  { value: 'CANCELLED',         label: 'Cancelled'         },
];

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

function emptyForm(): CreateDonationDto {
  return {
    categoryId: '',
    donorName: '',
    donorPhone: '',
    amount: 0,
    mode: 'CASH',
    paymentDate: todayIST(),
    pan: '',
    isAnonymous: false,
    notes: '',
  };
}

/**
 * Returns Tailwind classes for amount cell colouring.
 * ≥₹10,000 = gold, ≥₹5,000 = brand-primary, otherwise default.
 */
function amountClass(amount: string): string {
  const n = parseFloat(amount);
  if (n >= 10_000) return 'text-gold-accent-fg';
  if (n >= 5_000)  return 'text-brand-primary';
  return 'text-text-primary';
}

// ─── Table header cell ────────────────────────────────────────────────────────

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={[
        'px-4 py-3 text-caption text-text-muted font-medium uppercase tracking-wide whitespace-nowrap',
        align === 'right' ? 'text-right' : 'text-left',
      ].join(' ')}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ChevronsUpDown size={11} className="text-text-muted/50 shrink-0" aria-hidden="true" />
      </span>
    </th>
  );
}

// ─── Mobile card (shown instead of table row on small screens) ────────────────

function DonationCard({
  d,
  categoryName,
}: {
  d: {
    id: string;
    receiptNumber?: string | null;
    donorName: string;
    donorPhone?: string | null;
    amount: string;
    mode: string;
    status: string;
    paymentDate: string;
    is80gEligible: boolean;
  };
  categoryName: string;
}) {
  return (
    <div className="p-4 border-b border-border-subtle last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-label text-text-primary truncate">{d.donorName}</p>
          {d.donorPhone && <p className="text-caption text-text-muted">{d.donorPhone}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={['text-label font-semibold', amountClass(d.amount)].join(' ')}>
            ₹{fmtINR(d.amount)}
          </p>
          {d.is80gEligible && <Badge label="80G" variant="info" />}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <Badge label={d.status} />
        <span className="text-caption text-text-muted">{d.mode}</span>
        <span className="text-caption text-text-muted" aria-hidden="true">·</span>
        <span className="text-caption text-text-muted">{categoryName}</span>
        <span className="text-caption text-text-muted" aria-hidden="true">·</span>
        <span className="text-caption text-text-muted">{formatDateString(d.paymentDate)}</span>
      </div>
      {d.receiptNumber && (
        <p className="mt-1.5 text-caption text-text-muted font-mono">{d.receiptNumber}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DonationsPage() {
  const [filters, setFilters] = useState<DonationFilters>({ page: 1, limit: 20 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateDonationDto>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateDonationDto, string>>>({});
  const [devoteeId, setDevoteeId] = useState<string | null>(null);
  const [devoteeStatus, setDevoteeStatus] = useState<'found' | 'new' | null>(null);
  const [devoteeFoundName, setDevoteeFoundName] = useState('');
  const [devoteeWarning, setDevoteeWarning] = useState('');
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError } = useDonations(filters);
  const { data: categories = [] } = useDonationCategories();
  const createMutation = useCreateDonation();

  function setFilter<K extends keyof DonationFilters>(key: K, value: DonationFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function setField<K extends keyof CreateDonationDto>(key: K, value: CreateDonationDto[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm());
    setFormErrors({});
    setDevoteeId(null);
    setDevoteeStatus(null);
    setDevoteeFoundName('');
    setDevoteeWarning('');
  }

  function handlePhoneChange(rawValue: string): void {
    const cleaned = rawValue.replace(/\D/g, '').slice(0, 10);
    setField('donorPhone', cleaned);

    // Clear previous debounce timer
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);

    if (cleaned.length === 0) {
      if (devoteeStatus === 'found') {
        setForm((prev) => ({ ...prev, donorPhone: '', donorName: '', pan: '' }));
      }
      setDevoteeId(null);
      setDevoteeStatus(null);
      setDevoteeFoundName('');
      return;
    }

    // Only look up once we have a complete valid number, after a 300ms pause
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setDevoteeStatus(null);
      setDevoteeFoundName('');
      setDevoteeId(null);
      return;
    }

    phoneDebounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const result = await apiGet<{ data: DevoteeDetail[]; meta: { total: number } }>('/devotees', { search: cleaned, limit: 1 });
          if (!result.data.length) throw new Error('not found');
          const devotee = result.data[0]!;
          setDevoteeId(devotee.id);
          setDevoteeFoundName(devotee.name);
          setDevoteeStatus('found');
          setForm((prev) => ({
            ...prev,
            donorName: devotee.name,
            pan: devotee.panNumberMasked ?? prev.pan,
          }));
        } catch {
          setDevoteeId(null);
          setDevoteeFoundName('');
          setDevoteeStatus('new');
        }
      })();
    }, 300);
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CreateDonationDto, string>> = {};
    if (!form.donorName.trim()) errs.donorName = 'Donor name is required';
    if (!form.categoryId) errs.categoryId = 'Category is required';
    if (!form.amount || form.amount <= 0) errs.amount = 'Enter a valid amount';
    if (!form.mode) errs.mode = 'Select payment mode';
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    if (form.donorPhone && !/^[6-9]\d{9}$/.test(form.donorPhone)) {
      errs.donorPhone = 'Enter a valid 10-digit mobile number';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const dto: CreateDonationDto = {
      ...form,
      donorPhone: form.donorPhone || undefined,
      pan: form.pan || undefined,
      notes: form.notes || undefined,
      devoteeId: devoteeStatus === 'found' ? (devoteeId ?? undefined) : undefined,
    };

    createMutation.mutate(dto, {
      onSuccess: (createdDonation) => {
        if (devoteeStatus === 'new' && form.donorPhone) {
          const cleaned = form.donorPhone.replace(/\D/g, '');
          if (/^[6-9]\d{9}$/.test(cleaned)) {
            void (async () => {
              try {
                const newDevotee = await apiPost<{ id: string }>('/devotees', {
                  name: form.donorName,
                  phone: cleaned,
                });
                await apiPatch(`/donations/${createdDonation.id}/devotee`, { devoteeId: newDevotee.id });
              } catch {
                setDevoteeWarning('Donation saved. Devotee registration failed — please add them manually.');
              }
            })();
          }
        }
        closeModal();
      },
    });
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const meta = data?.meta;

  // Count active non-search filters to show on the Filters button badge
  const activeFilterCount = [
    filters.fromDate, filters.toDate, filters.mode, filters.categoryId, filters.status,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">

      {/* Devotee-link warning toast */}
      {devoteeWarning && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg bg-warning-subtle border border-warning/30 px-4 py-3 text-warning-fg text-body"
        >
          <span>{devoteeWarning}</span>
          <button
            type="button"
            onClick={() => setDevoteeWarning('')}
            className="flex-shrink-0 text-warning-fg/70 hover:text-warning-fg transition-colors cursor-pointer"
            aria-label="Dismiss warning"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text-primary">Donations</h1>
          {meta && (
            <p className="mt-0.5 text-caption text-text-muted">{meta.total} total records</p>
          )}
        </div>
        <Button
          onClick={() => { setForm(emptyForm()); setModalOpen(true); }}
          size="md"
        >
          <PlusCircle size={16} aria-hidden="true" />
          New Donation
        </Button>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-bg-surface border border-border-subtle p-3">

        {/* Always-visible row: search + toggle */}
        <div className="flex items-end gap-2">
          {/* Inline search with icon */}
          <div className="flex-1 relative">
            <Search
              size={15}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search donor name…"
              value={filters.search ?? ''}
              onChange={(e) => setFilter('search', e.target.value || undefined)}
              aria-label="Search donations"
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-border-default bg-bg-surface-2 text-text-primary text-body placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
            />
          </div>

          {/* Filters toggle pill */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="filter-panel"
            className={[
              'inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border text-label text-[13px]',
              'transition-all duration-150 cursor-pointer whitespace-nowrap flex-shrink-0',
              filtersOpen
                ? 'bg-brand-primary-subtle border-brand-primary/40 text-brand-primary'
                : 'bg-bg-surface border-border-default text-text-secondary hover:border-brand-primary/40 hover:text-brand-primary hover:bg-brand-primary-subtle',
            ].join(' ')}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expandable filter controls */}
        {filtersOpen && (
          <div
            id="filter-panel"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 mt-3 border-t border-border-subtle"
          >
            <Input
              label="From date"
              type="date"
              value={filters.fromDate ?? ''}
              onChange={(e) => setFilter('fromDate', e.target.value || undefined)}
            />
            <Input
              label="To date"
              type="date"
              value={filters.toDate ?? ''}
              onChange={(e) => setFilter('toDate', e.target.value || undefined)}
            />
            <Select
              label="Mode"
              options={MODE_OPTIONS}
              placeholder="All modes"
              value={filters.mode ?? ''}
              onChange={(e) => setFilter('mode', e.target.value || undefined)}
            />
            <Select
              label="Category"
              options={categoryOptions}
              placeholder="All categories"
              value={filters.categoryId ?? ''}
              onChange={(e) => setFilter('categoryId', e.target.value || undefined)}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              placeholder="All statuses"
              value={filters.status ?? ''}
              onChange={(e) => setFilter('status', e.target.value || undefined)}
            />
          </div>
        )}
      </div>

      {/* ── Table + mobile cards ──────────────────────────────────────── */}
      <div className="rounded-xl bg-bg-surface border border-border-subtle overflow-hidden">

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-surface-2">
                <Th>Receipt #</Th>
                <Th>Donor</Th>
                <Th>Category</Th>
                <Th align="right">Amount</Th>
                <Th>Mode</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </thead>

            {isLoading ? (
              <tbody><TableSkeleton rows={8} columns={7} /></tbody>
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-danger text-body">
                    Failed to load donations. Please try again.
                  </td>
                </tr>
              </tbody>
            ) : !data?.data.length ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted text-body">
                    No donations found
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {data.data.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border-subtle hover:bg-bg-surface-2 transition-colors"
                  >
                    {/* Receipt # */}
                    <td className="px-4 py-3 text-caption text-text-muted font-mono whitespace-nowrap">
                      {d.receiptNumber ?? '—'}
                    </td>

                    {/* Donor name + phone */}
                    <td className="px-4 py-3">
                      <p className="text-label text-text-primary">{d.donorName}</p>
                      {d.donorPhone && (
                        <p className="text-caption text-text-muted">{d.donorPhone}</p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-body text-text-secondary">
                      {categories.find((c) => c.id === d.categoryId)?.name ?? '—'}
                    </td>

                    {/* Amount — colour-coded by tier */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={['text-label font-semibold', amountClass(d.amount)].join(' ')}>
                        ₹{fmtINR(d.amount)}
                      </span>
                      {d.is80gEligible && (
                        <span className="ml-1.5 align-middle">
                          <Badge label="80G" variant="info" />
                        </span>
                      )}
                    </td>

                    {/* Mode */}
                    <td className="px-4 py-3 text-body text-text-secondary">{d.mode}</td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <Badge label={d.status} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-caption text-text-muted whitespace-nowrap">
                      {formatDateString(d.paymentDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="divide-y divide-border-subtle">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`skeleton-card-${i}`} className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-32 bg-bg-surface-2 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-bg-surface-2 rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-48 bg-bg-surface-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="px-4 py-12 text-center text-danger text-body">
              Failed to load donations. Please try again.
            </p>
          ) : !data?.data.length ? (
            <p className="px-4 py-12 text-center text-text-muted text-body">No donations found</p>
          ) : (
            data.data.map((d) => (
              <DonationCard
                key={d.id}
                d={d}
                categoryName={categories.find((c) => c.id === d.categoryId)?.name ?? '—'}
              />
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

      {/* ── Create donation modal ─────────────────────────────────────── */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Record Donation">
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* ── Section: Donor Details ──────────────────────────────── */}
          <div>
            <p className="text-caption text-text-muted font-medium uppercase tracking-widest mb-3">
              Donor Details
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Phone"
                    type="tel"
                    placeholder="98765 43210"
                    value={form.donorPhone ?? ''}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    error={formErrors.donorPhone}
                  />
                  {/* Devotee lookup status */}
                  {devoteeStatus === 'found' && (
                    <p className="mt-1 text-caption text-success flex items-center gap-1">
                      <CheckCircle size={12} aria-hidden="true" />
                      Devotee found: {devoteeFoundName}
                    </p>
                  )}
                  {devoteeStatus === 'new' && (
                    <p className="mt-1 text-caption text-warning">
                      New devotee — will be registered on save
                    </p>
                  )}
                </div>
                <Input
                  label="PAN"
                  placeholder="ABCDE1234F"
                  value={form.pan ?? ''}
                  onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>

              <Input
                label="Donor Name *"
                placeholder="Full name"
                value={form.donorName}
                onChange={(e) => setField('donorName', e.target.value)}
                error={formErrors.donorName}
              />
            </div>
          </div>

          {/* Divider */}
          <hr className="border-border-subtle" />

          {/* ── Section: Donation Details ───────────────────────────── */}
          <div>
            <p className="text-caption text-text-muted font-medium uppercase tracking-widest mb-3">
              Donation Details
            </p>
            <div className="space-y-3">
              <Select
                label="Category *"
                options={categoryOptions}
                placeholder="Select category"
                value={form.categoryId}
                onChange={(e) => setField('categoryId', e.target.value)}
                error={formErrors.categoryId}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Amount (₹) *"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={form.amount || ''}
                  onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                  error={formErrors.amount}
                />
                <Select
                  label="Mode *"
                  options={MODE_OPTIONS}
                  value={form.mode}
                  onChange={(e) => setField('mode', e.target.value)}
                  error={formErrors.mode}
                />
              </div>

              <Input
                label="Payment Date *"
                type="date"
                value={form.paymentDate}
                onChange={(e) => setField('paymentDate', e.target.value)}
                error={formErrors.paymentDate}
              />

              <Input
                label="Notes"
                placeholder="Any remarks…"
                value={form.notes ?? ''}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Mutation error */}
          {createMutation.isError && (
            <p className="flex items-center gap-1.5 text-caption text-danger" role="alert">
              <AlertCircle size={13} aria-hidden="true" />
              Failed to record donation. Please try again.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 border-t border-border-subtle">
            <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={createMutation.isPending}>
              Record Donation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
