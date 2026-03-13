import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import {
  useSevaBookings, useSevaTypes, useCreateSevaBooking,
  type SevaBookingFilters, type CreateSevaBookingDto,
} from '@/api/sevas.api';
import { apiGet, apiPost, apiPatch } from '@/lib/api-client';
import type { DevoteeDetail } from '@/api/devotees.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'CONFIRMED',       label: 'Confirmed'       },
  { value: 'COMPLETED',       label: 'Completed'       },
  { value: 'CANCELLED',       label: 'Cancelled'       },
  { value: 'NO_SHOW',         label: 'No Show'         },
];

const PAYMENT_MODE_OPTIONS = [
  { value: 'CASH',   label: 'Cash'   },
  { value: 'UPI',    label: 'UPI'    },
  { value: 'CARD',   label: 'Card'   },
  { value: 'ONLINE', label: 'Online' },
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

function emptyForm(): CreateSevaBookingDto {
  return {
    sevaTypeId: '',
    devoteeName: '',
    devoteePhone: '',
    sevaDate: todayIST(),
    timeSlot: '07:00',
    tierName: '',
    amount: 0,
    paymentMode: 'CASH',
    sankalpaName: '',
    gotra: '',
  };
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border-subtle">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-bg-surface-2 rounded animate-pulse"
                style={{ width: `${55 + (j * 11) % 45}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

interface BookingCardProps {
  b: {
    id: string;
    bookingNumber?: string;
    devoteeName: string;
    devoteePhone?: string;
    sevaTypeId: string;
    tierName: string;
    sevaDate: string;
    timeSlot: string;
    amount: string;
    paymentMode: string;
    status: string;
  };
  sevaTypeName: string;
}

function BookingCard({ b, sevaTypeName }: BookingCardProps) {
  return (
    <div className="p-4 border-b border-border-subtle last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-label text-text-primary truncate">{b.devoteeName}</p>
          {b.devoteePhone && <p className="text-caption text-text-muted">{b.devoteePhone}</p>}
        </div>
        <p className="text-label font-semibold text-text-primary flex-shrink-0">
          ₹{parseFloat(b.amount).toLocaleString('en-IN')}
        </p>
      </div>
      <p className="text-body text-text-secondary truncate">{sevaTypeName}</p>
      <p className="text-caption text-text-muted">{b.tierName}</p>
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <Badge label={b.status} />
        <span className="text-caption text-text-muted">{formatDateString(b.sevaDate)}</span>
        <span className="text-caption text-text-muted">·</span>
        <span className="text-caption text-text-muted">{b.timeSlot}</span>
        <span className="text-caption text-text-muted">·</span>
        <span className="text-caption text-text-muted">{b.paymentMode}</span>
      </div>
      {b.bookingNumber && (
        <p className="mt-1 text-caption text-text-muted font-mono">{b.bookingNumber}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SevaBookingsPage() {
  const [filters, setFilters] = useState<SevaBookingFilters>({ page: 1, limit: 20 });
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateSevaBookingDto>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateSevaBookingDto, string>>>({});
  const [devoteeId, setDevoteeId] = useState<string | null>(null);
  const [devoteeStatus, setDevoteeStatus] = useState<'found' | 'new' | null>(null);
  const [devoteeFoundName, setDevoteeFoundName] = useState('');

  const { data, isLoading, isError } = useSevaBookings(filters);
  const { data: sevaTypes = [] } = useSevaTypes();
  const createMutation = useCreateSevaBooking();

  function setFilter<K extends keyof SevaBookingFilters>(key: K, value: SevaBookingFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function setField<K extends keyof CreateSevaBookingDto>(key: K, value: CreateSevaBookingDto[K]) {
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
    setField('devoteePhone', rawValue);
    const cleaned = rawValue.replace(/\D/g, '');

    if (cleaned.length === 0) {
      if (devoteeStatus === 'found') {
        setForm((prev) => ({ ...prev, devoteePhone: rawValue, devoteeName: '' }));
      }
      setDevoteeId(null);
      setDevoteeStatus(null);
      setDevoteeFoundName('');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleaned)) return;

    try {
      const result = await apiGet<{ data: DevoteeDetail[]; total: number }>('/devotees', { search: cleaned, limit: 1 });
      if (!result.data.length) throw new Error('not found');
      const devotee = result.data[0]!;
      setDevoteeId(devotee.id);
      setDevoteeFoundName(devotee.name);
      setDevoteeStatus('found');
      setForm((prev) => ({ ...prev, devoteeName: devotee.name }));
    } catch {
      setDevoteeId(null);
      setDevoteeFoundName('');
      setDevoteeStatus('new');
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CreateSevaBookingDto, string>> = {};
    if (!form.sevaTypeId) errs.sevaTypeId = 'Select a seva type';
    if (!form.devoteeName.trim()) errs.devoteeName = 'Devotee name is required';
    if (!form.sevaDate) errs.sevaDate = 'Seva date is required';
    if (!form.timeSlot.trim()) errs.timeSlot = 'Time slot is required';
    if (!form.tierName.trim()) errs.tierName = 'Tier name is required';
    if (!form.amount || form.amount <= 0) errs.amount = 'Enter a valid amount';
    if (form.devoteePhone && !/^[6-9]\d{9}$/.test(form.devoteePhone)) {
      errs.devoteePhone = 'Enter a valid 10-digit mobile number';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const dto: CreateSevaBookingDto = {
      ...form,
      devoteePhone: form.devoteePhone || undefined,
      devoteeId: devoteeStatus === 'found' ? (devoteeId ?? undefined) : undefined,
      sankalpaName: form.sankalpaName || undefined,
      gotra: form.gotra || undefined,
    };

    createMutation.mutate(dto, {
      onSuccess: (createdBooking) => {
        if (devoteeStatus === 'new' && form.devoteePhone) {
          const cleaned = form.devoteePhone.replace(/\D/g, '');
          if (/^[6-9]\d{9}$/.test(cleaned)) {
            void (async () => {
              try {
                const newDevotee = await apiPost<{ id: string }>('/devotees', {
                  name: form.devoteeName,
                  phone: cleaned,
                });
                await apiPatch(`/sevas/bookings/${createdBooking.id}/devotee`, { devoteeId: newDevotee.id });
              } catch {
                // silently ignore — booking already saved
              }
            })();
          }
        }
        closeModal();
      },
    });
  }

  const selectedType = sevaTypes.find((t) => t.id === form.sevaTypeId);
  const tierOptions = selectedType?.pricingTiers.map((t) => ({
    value: t.name,
    label: `${t.name} — ₹${t.price}`,
  })) ?? [];
  const sevaTypeOptions = sevaTypes.map((t) => ({ value: t.id, label: t.name }));
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text-primary">Seva Bookings</h1>
          {meta && (
            <p className="mt-0.5 text-caption text-text-muted">{meta.total} total records</p>
          )}
        </div>
        <Button onClick={() => { setForm(emptyForm()); setModalOpen(true); }}>+ New Booking</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg bg-bg-surface border border-border-subtle p-4">
        <div className="flex-1 min-w-[140px]">
          <Input
            label="Date"
            type="date"
            value={filters.date ?? ''}
            onChange={(e) => setFilter('date', e.target.value || undefined)}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Select
            label="Seva Type"
            options={sevaTypeOptions}
            placeholder="All types"
            value={filters.sevaTypeId ?? ''}
            onChange={(e) => setFilter('sevaTypeId', e.target.value || undefined)}
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
      </div>

      {/* Table + cards */}
      <div className="rounded-lg bg-bg-surface border border-border-subtle overflow-hidden">

        {/* ── Desktop table ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-surface-2">
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Booking #</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Devotee</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Seva</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Date & Slot</th>
                <th className="px-4 py-3 text-right text-caption text-text-muted font-medium uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Mode</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Status</th>
              </tr>
            </thead>

            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-danger-DEFAULT text-body">
                    Failed to load bookings. Please try again.
                  </td>
                </tr>
              </tbody>
            ) : !data?.data.length ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted text-body">
                    No bookings found
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {data.data.map((b) => (
                  <tr key={b.id} className="border-b border-border-subtle hover:bg-bg-surface-2 transition-colors">
                    <td className="px-4 py-3 text-caption text-text-muted font-mono">
                      {b.bookingNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-label text-text-primary">{b.devoteeName}</p>
                      {b.devoteePhone && (
                        <p className="text-caption text-text-muted">{b.devoteePhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body text-text-secondary">
                        {sevaTypes.find((t) => t.id === b.sevaTypeId)?.name ?? '—'}
                      </p>
                      <p className="text-caption text-text-muted">{b.tierName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body text-text-secondary">{formatDateString(b.sevaDate)}</p>
                      <p className="text-caption text-text-muted">{b.timeSlot}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-label font-semibold text-text-primary">
                      ₹{parseFloat(b.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-body text-text-secondary">{b.paymentMode}</td>
                    <td className="px-4 py-3">
                      <Badge label={b.status} />
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
                <div key={i} className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-32 bg-bg-surface-2 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-bg-surface-2 rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-48 bg-bg-surface-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="px-4 py-12 text-center text-danger-DEFAULT text-body">
              Failed to load bookings. Please try again.
            </p>
          ) : !data?.data.length ? (
            <p className="px-4 py-12 text-center text-text-muted text-body">No bookings found</p>
          ) : (
            data.data.map((b) => (
              <BookingCard
                key={b.id}
                b={b}
                sevaTypeName={sevaTypes.find((t) => t.id === b.sevaTypeId)?.name ?? '—'}
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

      {/* Create booking modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="New Seva Booking">
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Select
            label="Seva Type *"
            options={sevaTypeOptions}
            placeholder="Select seva"
            value={form.sevaTypeId}
            onChange={(e) => {
              setField('sevaTypeId', e.target.value);
              setField('tierName', '');
              setField('amount', 0);
            }}
            error={formErrors.sevaTypeId}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Phone"
                type="tel"
                placeholder="98765 43210"
                value={form.devoteePhone ?? ''}
                onChange={(e) => { void handlePhoneChange(e.target.value); }}
                error={formErrors.devoteePhone}
              />
              {devoteeStatus === 'found' && (
                <p className="mt-1 text-caption text-success-DEFAULT">✓ Devotee found: {devoteeFoundName}</p>
              )}
              {devoteeStatus === 'new' && (
                <p className="mt-1 text-caption text-warning-DEFAULT">New devotee — will be registered on save</p>
              )}
            </div>
            <Input
              label="Sankalpa Name"
              placeholder="Name for puja"
              value={form.sankalpaName ?? ''}
              onChange={(e) => setField('sankalpaName', e.target.value)}
            />
          </div>

          <Input
            label="Devotee Name *"
            placeholder="Full name"
            value={form.devoteeName}
            onChange={(e) => setField('devoteeName', e.target.value)}
            error={formErrors.devoteeName}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Seva Date *"
              type="date"
              value={form.sevaDate}
              onChange={(e) => setField('sevaDate', e.target.value)}
              error={formErrors.sevaDate}
            />
            <Input
              label="Time Slot *"
              type="time"
              value={form.timeSlot}
              onChange={(e) => setField('timeSlot', e.target.value)}
              error={formErrors.timeSlot}
            />
          </div>

          {tierOptions.length > 0 ? (
            <Select
              label="Tier *"
              options={tierOptions}
              placeholder="Select tier"
              value={form.tierName}
              onChange={(e) => {
                const tier = selectedType?.pricingTiers.find((t) => t.name === e.target.value);
                setField('tierName', e.target.value);
                if (tier) setField('amount', tier.price);
              }}
              error={formErrors.tierName}
            />
          ) : (
            <Input
              label="Tier Name *"
              placeholder="e.g. Silver, Gold"
              value={form.tierName}
              onChange={(e) => setField('tierName', e.target.value)}
              error={formErrors.tierName}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Amount (₹) *"
              type="number"
              min="1"
              value={form.amount || ''}
              onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
              error={formErrors.amount}
            />
            <Select
              label="Payment Mode *"
              options={PAYMENT_MODE_OPTIONS}
              value={form.paymentMode}
              onChange={(e) => setField('paymentMode', e.target.value)}
            />
          </div>

          <Input
            label="Gotra"
            placeholder="Optional"
            value={form.gotra ?? ''}
            onChange={(e) => setField('gotra', e.target.value)}
          />

          {createMutation.isError && (
            <p className="text-caption text-danger-DEFAULT">
              Failed to create booking. Please try again.
            </p>
          )}

          <div className="flex gap-3 pt-2 border-t border-border-subtle">
            <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={createMutation.isPending}>
              Create Booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
