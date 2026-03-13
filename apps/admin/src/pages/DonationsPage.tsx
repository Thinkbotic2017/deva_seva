import { useState } from 'react';
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
  { value: 'PENDING',            label: 'Pending'          },
  { value: 'CONFIRMED',          label: 'Confirmed'        },
  { value: 'RECEIPT_GENERATED',  label: 'Receipt Generated'},
  { value: 'RECEIPT_SENT',       label: 'Receipt Sent'     },
  { value: 'CANCELLED',          label: 'Cancelled'        },
];

function todayIST(): string {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const yyyy = nowIST.getUTCFullYear();
  const mm = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(nowIST.getUTCDate()).padStart(2, '0');
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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-surface-2 rounded animate-pulse" style={{ width: `${60 + (j * 13) % 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DonationsPage() {
  const [filters, setFilters] = useState<DonationFilters>({ page: 1, limit: 20 });
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateDonationDto>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateDonationDto, string>>>({});
  const [devoteeId, setDevoteeId] = useState<string | null>(null);
  const [devoteeStatus, setDevoteeStatus] = useState<'found' | 'new' | null>(null);
  const [devoteeFoundName, setDevoteeFoundName] = useState('');

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
  }

  async function handlePhoneChange(rawValue: string): Promise<void> {
    setField('donorPhone', rawValue);
    const cleaned = rawValue.replace(/\D/g, '');

    if (cleaned.length === 0) {
      // Phone cleared — undo any autofill that was applied
      if (devoteeStatus === 'found') {
        setForm((prev) => ({ ...prev, donorPhone: rawValue, donorName: '', pan: '' }));
      }
      setDevoteeId(null);
      setDevoteeStatus(null);
      setDevoteeFoundName('');
      return;
    }

    // Only trigger lookup on a complete, valid Indian mobile number
    if (!/^[6-9]\d{9}$/.test(cleaned)) return;

    try {
      const result = await apiGet<{ data: DevoteeDetail[]; total: number }>('/devotees', { search: cleaned, limit: 1 });
      if (!result.data.length) throw new Error('not found');
      const devotee = result.data[0];
      setDevoteeId(devotee.id);
      setDevoteeFoundName(devotee.name);
      setDevoteeStatus('found');
      // Autofill name and PAN — fields remain editable after
      setForm((prev) => ({
        ...prev,
        donorName: devotee.name,
        pan: devotee.panNumberMasked ?? prev.pan,
      }));
    } catch {
      // 404 = devotee not on record; any network error treated the same way
      setDevoteeId(null);
      setDevoteeFoundName('');
      setDevoteeStatus('new');
    }
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
      // devoteeId only when found — backend links new devotees separately
      devoteeId: devoteeStatus === 'found' ? (devoteeId ?? undefined) : undefined,
    };

    createMutation.mutate(dto, {
      onSuccess: (createdDonation) => {
        // Fire-and-forget: register new devotee after donation is saved
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
                // silently ignore — donation is already saved
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text-primary">Donations</h1>
          {meta && (
            <p className="mt-0.5 text-caption text-text-muted">{meta.total} total records</p>
          )}
        </div>
        <Button onClick={() => { setForm(emptyForm()); setModalOpen(true); }}>+ New Donation</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg bg-surface border border-border p-4">
        <div className="flex-1 min-w-[140px]">
          <Input
            label="From date"
            type="date"
            value={filters.fromDate ?? ''}
            onChange={(e) => setFilter('fromDate', e.target.value || undefined)}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Input
            label="To date"
            type="date"
            value={filters.toDate ?? ''}
            onChange={(e) => setFilter('toDate', e.target.value || undefined)}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Select
            label="Mode"
            options={MODE_OPTIONS}
            placeholder="All modes"
            value={filters.mode ?? ''}
            onChange={(e) => setFilter('mode', e.target.value || undefined)}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Category"
            options={categoryOptions}
            placeholder="All categories"
            value={filters.categoryId ?? ''}
            onChange={(e) => setFilter('categoryId', e.target.value || undefined)}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            placeholder="All statuses"
            value={filters.status ?? ''}
            onChange={(e) => setFilter('status', e.target.value || undefined)}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Input
            label="Search"
            placeholder="Donor name…"
            value={filters.search ?? ''}
            onChange={(e) => setFilter('search', e.target.value || undefined)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-surface border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Receipt #</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Donor</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-right text-caption text-text-muted font-medium uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Mode</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Date</th>
              </tr>
            </thead>

            {isLoading ? (
              <TableSkeleton />
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
                  <tr key={d.id} className="border-b border-border hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 text-caption text-text-muted font-mono">
                      {d.receiptNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-label text-text-primary">{d.donorName}</p>
                      {d.donorPhone && (
                        <p className="text-caption text-text-muted">{d.donorPhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-body text-text-secondary">
                      {categories.find((c) => c.id === d.categoryId)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-label font-semibold text-text-primary">
                        ₹{parseFloat(d.amount).toLocaleString('en-IN')}
                      </span>
                      {d.is80gEligible && (
                        <span className="ml-1.5 text-caption text-info">80G</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-body text-text-secondary">{d.mode}</td>
                    <td className="px-4 py-3">
                      <Badge label={d.status} />
                    </td>
                    <td className="px-4 py-3 text-caption text-text-muted">
                      {formatDateString(d.paymentDate)}
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

      {/* Create donation modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Record Donation">
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Phone"
                type="tel"
                placeholder="98765 43210"
                value={form.donorPhone ?? ''}
                onChange={(e) => { void handlePhoneChange(e.target.value); }}
                error={formErrors.donorPhone}
              />
              {devoteeStatus === 'found' && (
                <p className="mt-1 text-caption text-green-600">✓ Devotee found: {devoteeFoundName}</p>
              )}
              {devoteeStatus === 'new' && (
                <p className="mt-1 text-caption text-amber-600">New devotee — will be registered on save</p>
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

          <Select
            label="Category *"
            options={categoryOptions}
            placeholder="Select category"
            value={form.categoryId}
            onChange={(e) => setField('categoryId', e.target.value)}
            error={formErrors.categoryId}
          />

          <div className="grid grid-cols-2 gap-3">
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

          {createMutation.isError && (
            <p className="text-caption text-danger">
              Failed to record donation. Please try again.
            </p>
          )}

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={createMutation.isPending}
            >
              Record Donation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
