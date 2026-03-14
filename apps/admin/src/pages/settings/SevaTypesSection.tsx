import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  useSevaTypesAdmin,
  useCreateSevaType,
  useUpdateSevaType,
  useDeleteSevaType,
  type SevaType,
  type SevaFrequency,
  type CreateSevaTypeDto,
} from '@/api/sevas.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS: Array<{ value: SevaFrequency; label: string }> = [
  { value: 'DAILY',     label: 'Daily'     },
  { value: 'WEEKLY',    label: 'Weekly'    },
  { value: 'MONTHLY',   label: 'Monthly'   },
  { value: 'FESTIVAL',  label: 'Festival'  },
  { value: 'ON_DEMAND', label: 'On Demand' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingTierRow {
  name: string;
  price: number;
}

interface SevaTypeForm {
  name: string;
  nameHi: string;
  description: string;
  frequency: SevaFrequency;
  durationMinutes: number;
  maxBookingsPerSlot: number;
  sortOrder: number;
  requiresSankalpa: boolean;
  isOnlineBookable: boolean;
  pricingTiers: PricingTierRow[];
}

const EMPTY_SEVA_FORM: SevaTypeForm = {
  name: '',
  nameHi: '',
  description: '',
  frequency: 'ON_DEMAND',
  durationMinutes: 60,
  maxBookingsPerSlot: 1,
  sortOrder: 0,
  requiresSankalpa: false,
  isOnlineBookable: false,
  pricingTiers: [],
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface SevaTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: SevaType | null;
  form: SevaTypeForm;
  onSetField: <K extends keyof SevaTypeForm>(key: K, value: SevaTypeForm[K]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errors: Partial<Record<keyof SevaTypeForm, string>>;
  submitError: string;
}

function SevaTypeModal({
  isOpen, onClose, editing, form, onSetField, onSubmit, isSubmitting, errors, submitError,
}: SevaTypeModalProps): JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit Seva Type' : 'Add Seva Type'}
      width="max-w-lg"
    >
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Name (English) *"
            value={form.name}
            onChange={(e) => onSetField('name', e.target.value)}
            placeholder="e.g. Rudrabhishek"
            error={errors.name}
          />
          <Input
            label="Name (Hindi)"
            value={form.nameHi}
            onChange={(e) => onSetField('nameHi', e.target.value)}
            placeholder="e.g. रुद्राभिषेक"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-label text-text-secondary">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => onSetField('description', e.target.value)}
            placeholder="Optional description"
            rows={2}
            className={[
              'rounded-md bg-bg-surface-2 px-4 py-3 text-body text-text-primary resize-none',
              'border border-border-subtle hover:border-text-muted transition-colors duration-150',
              'focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-bg-surface',
              'focus:border-transparent outline-none placeholder:text-text-muted',
            ].join(' ')}
          />
        </div>

        <Select
          label="Frequency *"
          options={FREQUENCY_OPTIONS}
          value={form.frequency}
          onChange={(e) => onSetField('frequency', e.target.value as SevaFrequency)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Duration (min)"
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => onSetField('durationMinutes', parseInt(e.target.value, 10) || 60)}
          />
          <Input
            label="Max Bookings/Slot"
            type="number"
            min={1}
            value={form.maxBookingsPerSlot}
            onChange={(e) => onSetField('maxBookingsPerSlot', parseInt(e.target.value, 10) || 1)}
          />
          <Input
            label="Sort Order"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => onSetField('sortOrder', parseInt(e.target.value, 10) || 0)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label text-text-secondary">Pricing Tiers</span>
          {form.pricingTiers.length > 0 && (
            <div className="flex gap-2 mb-1">
              <span className="flex-1 text-caption text-text-muted">Tier Name</span>
              <span className="w-28 text-caption text-text-muted">Price (₹)</span>
              <span className="w-7" />
            </div>
          )}
          {form.pricingTiers.map((tier, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="e.g. Basic"
                value={tier.name}
                onChange={(e) => {
                  const next = form.pricingTiers.map((t, i) =>
                    i === idx ? { ...t, name: e.target.value } : t,
                  );
                  onSetField('pricingTiers', next);
                }}
                className={[
                  'flex-1 rounded-md bg-bg-surface-2 px-3 py-2 text-body text-text-primary',
                  'border border-border-subtle hover:border-text-muted transition-colors duration-150',
                  'focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-bg-surface',
                  'focus:border-transparent outline-none placeholder:text-text-muted',
                ].join(' ')}
              />
              <input
                type="number"
                min={0}
                placeholder="0"
                value={tier.price || ''}
                onChange={(e) => {
                  const next = form.pricingTiers.map((t, i) =>
                    i === idx ? { ...t, price: parseFloat(e.target.value) || 0 } : t,
                  );
                  onSetField('pricingTiers', next);
                }}
                className={[
                  'w-28 rounded-md bg-bg-surface-2 px-3 py-2 text-body text-text-primary',
                  'border border-border-subtle hover:border-text-muted transition-colors duration-150',
                  'focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-bg-surface',
                  'focus:border-transparent outline-none placeholder:text-text-muted',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => onSetField('pricingTiers', form.pricingTiers.filter((_, i) => i !== idx))}
                className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-danger-DEFAULT hover:bg-danger-DEFAULT/10 transition-colors flex-shrink-0"
                aria-label="Remove tier"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onSetField('pricingTiers', [...form.pricingTiers, { name: '', price: 0 }])}
            className="self-start text-caption text-brand-primary hover:underline mt-0.5"
          >
            + Add Tier
          </button>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              role="switch"
              aria-checked={form.requiresSankalpa}
              tabIndex={0}
              onClick={() => onSetField('requiresSankalpa', !form.requiresSankalpa)}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onSetField('requiresSankalpa', !form.requiresSankalpa); } }}
              className={[
                'relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0',
                form.requiresSankalpa ? 'bg-brand-primary' : 'bg-bg-surface-2 border border-border-subtle',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                  form.requiresSankalpa ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </div>
            <span className="text-body text-text-primary">Requires Sankalpa</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              role="switch"
              aria-checked={form.isOnlineBookable}
              tabIndex={0}
              onClick={() => onSetField('isOnlineBookable', !form.isOnlineBookable)}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onSetField('isOnlineBookable', !form.isOnlineBookable); } }}
              className={[
                'relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0',
                form.isOnlineBookable ? 'bg-brand-primary' : 'bg-bg-surface-2 border border-border-subtle',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                  form.isOnlineBookable ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </div>
            <span className="text-body text-text-primary">Online Bookable</span>
          </label>
        </div>

        {submitError && (
          <p role="alert" className="text-caption text-danger-DEFAULT">
            {submitError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={isSubmitting}>
            {editing ? 'Save Changes' : 'Add Seva Type'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

/**
 * Self-contained CRUD section for seva types.
 * Manages its own modal state, form state, and API mutations.
 */
export function SevaTypesSection(): JSX.Element {
  const [isSevaModalOpen, setSevaModalOpen] = useState(false);
  const [editingSevaType, setEditingSevaType] = useState<SevaType | null>(null);
  const [sevaForm, setSevaForm] = useState<SevaTypeForm>(EMPTY_SEVA_FORM);
  const [sevaFormErrors, setSevaFormErrors] = useState<Partial<Record<keyof SevaTypeForm, string>>>({});
  const [submitError, setSubmitError] = useState('');

  const { data: sevaTypes = [], isLoading: sevaTypesLoading } = useSevaTypesAdmin();
  const createSevaTypeMutation = useCreateSevaType();
  const updateSevaTypeMutation = useUpdateSevaType();
  const deleteSevaTypeMutation = useDeleteSevaType();

  const isSevaSubmitting = createSevaTypeMutation.isPending || updateSevaTypeMutation.isPending;

  function setSevaField<K extends keyof SevaTypeForm>(key: K, value: SevaTypeForm[K]): void {
    setSevaForm((prev) => ({ ...prev, [key]: value }));
    setSevaFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function openCreateSeva(): void {
    setEditingSevaType(null);
    setSevaForm(EMPTY_SEVA_FORM);
    setSevaFormErrors({});
    setSevaModalOpen(true);
  }

  function openEditSeva(sevaType: SevaType): void {
    setEditingSevaType(sevaType);
    setSevaForm({
      name: sevaType.name,
      nameHi: sevaType.nameHi ?? '',
      description: sevaType.description ?? '',
      frequency: sevaType.frequency,
      durationMinutes: sevaType.durationMinutes,
      maxBookingsPerSlot: sevaType.maxBookingsPerSlot,
      sortOrder: sevaType.sortOrder,
      requiresSankalpa: sevaType.requiresSankalpa,
      isOnlineBookable: sevaType.isOnlineBookable,
      pricingTiers: sevaType.pricingTiers.map((t) => ({ name: t.name, price: t.price })),
    });
    setSevaFormErrors({});
    setSevaModalOpen(true);
  }

  function closeSevaModal(): void {
    setSevaModalOpen(false);
    setEditingSevaType(null);
    setSevaForm(EMPTY_SEVA_FORM);
    setSevaFormErrors({});
    setSubmitError('');
  }

  function validateSevaForm(): boolean {
    const errors: Partial<Record<keyof SevaTypeForm, string>> = {};
    if (!sevaForm.name.trim()) errors.name = 'Name is required';
    if (Object.keys(errors).length > 0) {
      setSevaFormErrors(errors);
      return false;
    }
    return true;
  }

  async function handleSevaSubmit(): Promise<void> {
    if (!validateSevaForm()) return;
    setSubmitError('');
    const dto: CreateSevaTypeDto = {
      name: sevaForm.name.trim(),
      nameHi: sevaForm.nameHi.trim() || undefined,
      description: sevaForm.description.trim() || undefined,
      frequency: sevaForm.frequency,
      durationMinutes: sevaForm.durationMinutes,
      maxBookingsPerSlot: sevaForm.maxBookingsPerSlot,
      sortOrder: sevaForm.sortOrder,
      requiresSankalpa: sevaForm.requiresSankalpa,
      isOnlineBookable: sevaForm.isOnlineBookable,
      pricingTiers: sevaForm.pricingTiers.filter((t) => t.name.trim()),
    };
    try {
      if (editingSevaType) {
        await updateSevaTypeMutation.mutateAsync({ id: editingSevaType.id, dto });
      } else {
        await createSevaTypeMutation.mutateAsync(dto);
      }
      closeSevaModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(message);
    }
  }

  async function handleToggleSevaActive(sevaType: SevaType): Promise<void> {
    if (sevaType.isActive) {
      const confirmed = window.confirm(
        `Deactivate "${sevaType.name}"? It will no longer appear in the booking form.`,
      );
      if (!confirmed) return;
    }
    await updateSevaTypeMutation.mutateAsync({
      id: sevaType.id,
      dto: { isActive: !sevaType.isActive },
    });
  }

  async function handleDeleteSeva(sevaType: SevaType): Promise<void> {
    const confirmed = window.confirm(
      `Permanently remove "${sevaType.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    await deleteSevaTypeMutation.mutateAsync(sevaType.id);
  }

  return (
    <>
      <section className="rounded-lg bg-bg-surface border border-border-subtle">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-h3 font-semibold text-text-primary">Seva Types</h2>
            <p className="mt-0.5 text-caption text-text-muted">
              Manage the sevas available for booking
            </p>
          </div>
          <Button size="sm" onClick={openCreateSeva}>
            + Add Seva Type
          </Button>
        </div>

        {sevaTypesLoading ? (
          <div className="divide-y divide-border-subtle">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`skeleton-seva-${i}`} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 h-4 bg-bg-surface-2 rounded animate-pulse" />
                <div className="w-20 h-6 bg-bg-surface-2 rounded animate-pulse" />
                <div className="w-20 h-8 bg-bg-surface-2 rounded-full animate-pulse" />
                <div className="w-16 h-8 bg-bg-surface-2 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : sevaTypes.length === 0 ? (
          <div className="px-5 py-10 text-center text-text-muted text-body">
            No seva types yet.{' '}
            <button
              className="text-brand-primary underline cursor-pointer"
              onClick={openCreateSeva}
            >
              Add the first one.
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {sevaTypes.map((st) => (
              <div
                key={st.id}
                className={[
                  'px-5 py-4 flex items-center gap-4',
                  !st.isActive && 'opacity-50',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-label text-text-primary truncate">
                    {st.name}
                    {st.nameHi && (
                      <span className="ml-2 text-caption text-text-muted">{st.nameHi}</span>
                    )}
                  </p>
                  <p className="text-caption text-text-muted">
                    {st.frequency} · {st.durationMinutes}min
                    {st.pricingTiers.length > 0 && (
                      <> · {st.pricingTiers.map((t) => `${t.name} ₹${t.price}`).join(', ')}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {st.requiresSankalpa && (
                    <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-brand-primary/10 text-brand-primary">
                      Sankalpa
                    </span>
                  )}
                  {st.isOnlineBookable && (
                    <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-info-subtle text-info-fg">
                      Online
                    </span>
                  )}
                  <span
                    className={[
                      'px-2 py-0.5 rounded-full text-caption font-medium',
                      st.isActive
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'bg-bg-surface-2 text-text-muted',
                    ].join(' ')}
                  >
                    {st.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <span className="text-caption text-text-muted flex-shrink-0 w-8 text-right">
                  #{st.sortOrder}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditSeva(st)}
                    disabled={deleteSevaTypeMutation.isPending}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { void handleToggleSevaActive(st); }}
                    disabled={updateSevaTypeMutation.isPending || deleteSevaTypeMutation.isPending}
                  >
                    {st.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => { void handleDeleteSeva(st); }}
                    disabled={deleteSevaTypeMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SevaTypeModal
        isOpen={isSevaModalOpen}
        onClose={closeSevaModal}
        editing={editingSevaType}
        form={sevaForm}
        onSetField={setSevaField}
        onSubmit={() => { void handleSevaSubmit(); }}
        isSubmitting={isSevaSubmitting}
        errors={sevaFormErrors}
        submitError={submitError}
      />
    </>
  );
}
