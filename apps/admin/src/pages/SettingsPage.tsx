import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  useDonationCategoriesAdmin,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type DonationCategory,
  type CreateDonationCategoryDto,
} from '@/api/donations.api';
import {
  useSevaTypesAdmin,
  useCreateSevaType,
  useUpdateSevaType,
  useDeleteSevaType,
  type SevaType,
  type SevaFrequency,
  type CreateSevaTypeDto,
} from '@/api/sevas.api';
import {
  useFinanceCategoriesAdmin,
  useCreateFinanceCategory,
  useUpdateFinanceCategory,
  useDeleteFinanceCategory,
  type FinanceCategory,
  type CreateFinanceCategoryDto,
} from '@/api/finance.api';
import { useTempleProfile } from '@/api/temple.api';

// ─── Tab definition ───────────────────────────────────────────────────────────

type Tab = 'donation-cats' | 'seva-types' | 'income-cats' | 'expense-cats' | 'web-integration';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'donation-cats',    label: 'Donation Categories' },
  { id: 'seva-types',       label: 'Seva Types'          },
  { id: 'income-cats',      label: 'Income Categories'   },
  { id: 'expense-cats',     label: 'Expense Categories'  },
  { id: 'web-integration',  label: 'Website Integration' },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { hex: '#E8530A', label: 'Saffron'     },
  { hex: '#C49A00', label: 'Gold'        },
  { hex: '#1455A0', label: 'Blue'        },
  { hex: '#16A34A', label: 'Green'       },
  { hex: '#9333EA', label: 'Purple'      },
  { hex: '#0891B2', label: 'Cyan'        },
  { hex: '#DC2626', label: 'Red'         },
  { hex: '#64748B', label: 'Slate'       },
  { hex: '#6366F1', label: 'Indigo'      },
  { hex: '#EC4899', label: 'Pink'        },
  { hex: '#F59E0B', label: 'Amber'       },
  { hex: '#10B981', label: 'Emerald'     },
  { hex: '#14B8A6', label: 'Teal'        },
  { hex: '#F97316', label: 'Orange'      },
  { hex: '#8B5CF6', label: 'Violet'      },
  { hex: '#EF4444', label: 'Rose Red'    },
  { hex: '#78716C', label: 'Stone'       },
  { hex: '#0369A1', label: 'Sky Blue'    },
  { hex: '#7C3AED', label: 'Deep Violet' },
  { hex: '#047857', label: 'Deep Green'  },
];

// ─── Donation Category modal ──────────────────────────────────────────────────

interface CategoryForm {
  name: string;
  description: string;
  is80gEligible: boolean;
  color: string;
  sortOrder: number;
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  description: '',
  is80gEligible: false,
  color: '#E8530A',
  sortOrder: 0,
};

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: DonationCategory | null;
  form: CategoryForm;
  onSetField: <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errors: Partial<Record<keyof CategoryForm, string>>;
}

function CategoryModal({
  isOpen, onClose, editing, form, onSetField, onSubmit, isSubmitting, errors,
}: CategoryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit Category' : 'Add Category'}
      width="max-w-md"
    >
      <div className="px-6 py-5 space-y-5">
        <Input
          label="Name *"
          value={form.name}
          onChange={(e) => onSetField('name', e.target.value)}
          placeholder="e.g. Annadanam"
          error={errors.name}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-label text-text-secondary">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => onSetField('description', e.target.value)}
            placeholder="Optional description"
            rows={2}
            className={[
              'rounded-md bg-surface-2 px-4 py-3 text-body text-text-primary resize-none',
              'border border-border hover:border-text-muted transition-colors duration-150',
              'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
              'focus:border-transparent outline-none placeholder:text-text-muted',
            ].join(' ')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label text-text-secondary">Colour</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(({ hex, label }) => (
              <button
                key={hex}
                type="button"
                title={label}
                onClick={() => onSetField('color', hex)}
                className={[
                  'w-8 h-8 rounded-full border-2 transition-all duration-150',
                  form.color === hex
                    ? 'border-text-primary scale-110'
                    : 'border-transparent hover:scale-105',
                ].join(' ')}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>

        <Input
          label="Sort Order"
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={(e) => onSetField('sortOrder', parseInt(e.target.value, 10) || 0)}
          hint="Lower numbers appear first in the counter UI"
        />

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            role="switch"
            aria-checked={form.is80gEligible}
            onClick={() => onSetField('is80gEligible', !form.is80gEligible)}
            className={[
              'relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer',
              form.is80gEligible ? 'bg-primary' : 'bg-surface-2 border border-border',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                form.is80gEligible ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </div>
          <span className="text-body text-text-primary">80G Eligible</span>
          <span className="text-caption text-text-muted">
            Donations qualify for tax exemption
          </span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={isSubmitting}>
            {editing ? 'Save Changes' : 'Add Category'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Seva Type modal ──────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS: Array<{ value: SevaFrequency; label: string }> = [
  { value: 'DAILY',     label: 'Daily'     },
  { value: 'WEEKLY',    label: 'Weekly'    },
  { value: 'MONTHLY',   label: 'Monthly'   },
  { value: 'FESTIVAL',  label: 'Festival'  },
  { value: 'ON_DEMAND', label: 'On Demand' },
];

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

interface SevaTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: SevaType | null;
  form: SevaTypeForm;
  onSetField: <K extends keyof SevaTypeForm>(key: K, value: SevaTypeForm[K]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errors: Partial<Record<keyof SevaTypeForm, string>>;
}

function SevaTypeModal({
  isOpen, onClose, editing, form, onSetField, onSubmit, isSubmitting, errors,
}: SevaTypeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit Seva Type' : 'Add Seva Type'}
      width="max-w-lg"
    >
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
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
              'rounded-md bg-surface-2 px-4 py-3 text-body text-text-primary resize-none',
              'border border-border hover:border-text-muted transition-colors duration-150',
              'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
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

        <div className="grid grid-cols-3 gap-3">
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
                  'flex-1 rounded-md bg-surface-2 px-3 py-2 text-body text-text-primary',
                  'border border-border hover:border-text-muted transition-colors duration-150',
                  'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
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
                  'w-28 rounded-md bg-surface-2 px-3 py-2 text-body text-text-primary',
                  'border border-border hover:border-text-muted transition-colors duration-150',
                  'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                  'focus:border-transparent outline-none placeholder:text-text-muted',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => onSetField('pricingTiers', form.pricingTiers.filter((_, i) => i !== idx))}
                className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                aria-label="Remove tier"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onSetField('pricingTiers', [...form.pricingTiers, { name: '', price: 0 }])}
            className="self-start text-caption text-primary hover:underline mt-0.5"
          >
            + Add Tier
          </button>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              role="switch"
              aria-checked={form.requiresSankalpa}
              onClick={() => onSetField('requiresSankalpa', !form.requiresSankalpa)}
              className={[
                'relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0',
                form.requiresSankalpa ? 'bg-primary' : 'bg-surface-2 border border-border',
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
              onClick={() => onSetField('isOnlineBookable', !form.isOnlineBookable)}
              className={[
                'relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0',
                form.isOnlineBookable ? 'bg-primary' : 'bg-surface-2 border border-border',
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

// ─── Finance Category modal (Income / Expense) ────────────────────────────────

interface FinanceCatForm {
  name: string;
  sortOrder: number;
  color: string;
}

const EMPTY_FINANCE_FORM: FinanceCatForm = { name: '', sortOrder: 0, color: '#6366F1' };

interface FinanceCatModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: FinanceCategory | null;
  form: FinanceCatForm;
  onSetField: <K extends keyof FinanceCatForm>(key: K, value: FinanceCatForm[K]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errors: Partial<Record<keyof FinanceCatForm, string>>;
  typeLabel: string;
  usedColors: string[];
}

function FinanceCatModal({
  isOpen, onClose, editing, form, onSetField, onSubmit, isSubmitting, errors, typeLabel, usedColors,
}: FinanceCatModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? `Edit ${typeLabel} Category` : `Add ${typeLabel} Category`}
      width="max-w-sm"
    >
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Name *"
          value={form.name}
          onChange={(e) => onSetField('name', e.target.value)}
          placeholder={typeLabel === 'Income' ? 'e.g. Temple Donations' : 'e.g. Utilities'}
          error={errors.name}
        />

        <div className="flex flex-col gap-2">
          <span className="text-label text-text-secondary">Colour</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(({ hex, label }) => {
              const isUsedByOther = usedColors.includes(hex);
              return (
                <button
                  key={hex}
                  type="button"
                  title={isUsedByOther ? `${label} (already used)` : label}
                  onClick={() => onSetField('color', hex)}
                  disabled={isUsedByOther}
                  className={[
                    'w-7 h-7 rounded-full border-2 transition-all duration-150',
                    form.color === hex
                      ? 'border-text-primary scale-110'
                      : isUsedByOther
                        ? 'border-transparent opacity-25 cursor-not-allowed'
                        : 'border-transparent hover:scale-105',
                  ].join(' ')}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        </div>

        <Input
          label="Sort Order"
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={(e) => onSetField('sortOrder', parseInt(e.target.value, 10) || 0)}
          hint="Lower numbers appear first"
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={isSubmitting}>
            {editing ? 'Save Changes' : `Add Category`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Finance Category section (reusable for Income + Expense) ─────────────────

interface FinanceCatSectionProps {
  type: 'INCOME' | 'EXPENSE';
  typeLabel: string;
  description: string;
}

function FinanceCatSection({ type, typeLabel, description }: FinanceCatSectionProps) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [form, setForm] = useState<FinanceCatForm>(EMPTY_FINANCE_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FinanceCatForm, string>>>({});

  const { data: categories = [], isLoading } = useFinanceCategoriesAdmin(type);
  const createMutation = useCreateFinanceCategory();
  const updateMutation = useUpdateFinanceCategory();
  const deleteMutation = useDeleteFinanceCategory();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function setField<K extends keyof FinanceCatForm>(key: K, value: FinanceCatForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FINANCE_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(cat: FinanceCategory) {
    setEditing(cat);
    setForm({ name: cat.name, sortOrder: cat.sortOrder, color: cat.color ?? '#6366F1' });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FINANCE_FORM);
    setFormErrors({});
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof FinanceCatForm, string>> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (editing) {
      await updateMutation.mutateAsync({
        id: editing.id,
        dto: { name: form.name.trim(), sortOrder: form.sortOrder, color: form.color },
      });
    } else {
      const dto: CreateFinanceCategoryDto = {
        name: form.name.trim(),
        type,
        sortOrder: form.sortOrder,
        color: form.color,
      };
      await createMutation.mutateAsync(dto);
    }
    closeModal();
  }

  async function handleToggleActive(cat: FinanceCategory) {
    if (cat.isSystem) return; // system categories are immutable
    if (cat.isActive) {
      const confirmed = window.confirm(
        `Deactivate "${cat.name}"? It will no longer appear in the finance entry form.`,
      );
      if (!confirmed) return;
    }
    await updateMutation.mutateAsync({ id: cat.id, dto: { isActive: !cat.isActive } });
  }

  async function handleDelete(cat: FinanceCategory) {
    if (cat.isSystem) return;
    const confirmed = window.confirm(
      `Deactivate "${cat.name}"? System categories cannot be deleted — this will hide it from forms.`,
    );
    if (!confirmed) return;
    await deleteMutation.mutateAsync(cat.id);
  }

  const usedColors = categories
    .filter((c) => c.id !== editing?.id)
    .map((c) => c.color)
    .filter((c): c is string => Boolean(c));

  return (
    <>
      <section className="rounded-lg bg-surface border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-h3 font-semibold text-text-primary">{typeLabel} Categories</h2>
            <p className="mt-0.5 text-caption text-text-muted">{description}</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            + Add Category
          </Button>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-4 h-4 bg-surface-2 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 h-4 bg-surface-2 rounded animate-pulse" />
                <div className="w-16 h-6 bg-surface-2 rounded animate-pulse" />
                <div className="w-20 h-8 bg-surface-2 rounded-full animate-pulse" />
                <div className="w-16 h-8 bg-surface-2 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="px-5 py-10 text-center text-text-muted text-body">
            No categories yet.{' '}
            <button className="text-primary underline cursor-pointer" onClick={openCreate}>
              Add the first one.
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={[
                  'px-5 py-4 flex items-center gap-4',
                  !cat.isActive && 'opacity-50',
                ].join(' ')}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: cat.color ?? '#6366F1' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-label text-text-primary truncate">{cat.name}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {cat.isSystem && (
                    <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-surface-2 text-text-muted">
                      System
                    </span>
                  )}
                  <span
                    className={[
                      'px-2 py-0.5 rounded-full text-caption font-medium',
                      cat.isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-2 text-text-muted',
                    ].join(' ')}
                  >
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <span className="text-caption text-text-muted flex-shrink-0 w-8 text-right">
                  #{cat.sortOrder}
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(cat)}
                    disabled={cat.isSystem || deleteMutation.isPending}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { void handleToggleActive(cat); }}
                    disabled={cat.isSystem || updateMutation.isPending || deleteMutation.isPending}
                  >
                    {cat.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => { void handleDelete(cat); }}
                    disabled={cat.isSystem || deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <FinanceCatModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editing={editing}
        form={form}
        onSetField={setField}
        onSubmit={() => { void handleSubmit(); }}
        isSubmitting={isSubmitting}
        errors={formErrors}
        typeLabel={typeLabel}
        usedColors={usedColors}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('donation-cats');
  const { data: templeProfile } = useTempleProfile();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }, []);

  // ── Donation Categories state ────────────────────────────────────────────
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DonationCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CategoryForm, string>>>({});

  const { data: categories = [], isLoading } = useDonationCategoriesAdmin();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ── Seva Types state ────────────────────────────────────────────────────
  const [isSevaModalOpen, setSevaModalOpen] = useState(false);
  const [editingSevaType, setEditingSevaType] = useState<SevaType | null>(null);
  const [sevaForm, setSevaForm] = useState<SevaTypeForm>(EMPTY_SEVA_FORM);
  const [sevaFormErrors, setSevaFormErrors] = useState<Partial<Record<keyof SevaTypeForm, string>>>({});

  const { data: sevaTypes = [], isLoading: sevaTypesLoading } = useSevaTypesAdmin();
  const createSevaTypeMutation = useCreateSevaType();
  const updateSevaTypeMutation = useUpdateSevaType();
  const deleteSevaTypeMutation = useDeleteSevaType();

  const isSevaSubmitting = createSevaTypeMutation.isPending || updateSevaTypeMutation.isPending;

  // ── Donation category handlers ───────────────────────────────────────────

  function setField<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function openCreate() {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(category: DonationCategory) {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description ?? '',
      is80gEligible: category.is80gEligible,
      color: category.color,
      sortOrder: category.sortOrder,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof CategoryForm, string>> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    const dto: CreateDonationCategoryDto = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      is80gEligible: form.is80gEligible,
      color: form.color,
      sortOrder: form.sortOrder,
    };
    if (editingCategory) {
      await updateMutation.mutateAsync({ id: editingCategory.id, dto });
    } else {
      await createMutation.mutateAsync(dto);
    }
    closeModal();
  }

  async function handleToggleActive(category: DonationCategory) {
    if (category.isActive) {
      const confirmed = window.confirm(
        `Deactivate "${category.name}"? It will no longer appear in the donation form.`,
      );
      if (!confirmed) return;
    }
    await updateMutation.mutateAsync({ id: category.id, dto: { isActive: !category.isActive } });
  }

  async function handleDelete(category: DonationCategory) {
    const confirmed = window.confirm(
      `Permanently remove "${category.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    await deleteMutation.mutateAsync(category.id);
  }

  // ── Seva type handlers ──────────────────────────────────────────────────

  function setSevaField<K extends keyof SevaTypeForm>(key: K, value: SevaTypeForm[K]) {
    setSevaForm((prev) => ({ ...prev, [key]: value }));
    setSevaFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function openCreateSeva() {
    setEditingSevaType(null);
    setSevaForm(EMPTY_SEVA_FORM);
    setSevaFormErrors({});
    setSevaModalOpen(true);
  }

  function openEditSeva(sevaType: SevaType) {
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

  function closeSevaModal() {
    setSevaModalOpen(false);
    setEditingSevaType(null);
    setSevaForm(EMPTY_SEVA_FORM);
    setSevaFormErrors({});
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

  async function handleSevaSubmit() {
    if (!validateSevaForm()) return;
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
    if (editingSevaType) {
      await updateSevaTypeMutation.mutateAsync({ id: editingSevaType.id, dto });
    } else {
      await createSevaTypeMutation.mutateAsync(dto);
    }
    closeSevaModal();
  }

  async function handleToggleSevaActive(sevaType: SevaType) {
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

  async function handleDeleteSeva(sevaType: SevaType) {
    const confirmed = window.confirm(
      `Permanently remove "${sevaType.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    await deleteSevaTypeMutation.mutateAsync(sevaType.id);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-h1 font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-body text-text-muted">Temple configuration and management</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-surface-2 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 rounded-md text-label transition-colors duration-150',
              activeTab === tab.id
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Donation Categories */}
      {activeTab === 'donation-cats' && (
        <>
          <section className="rounded-lg bg-surface border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-h3 font-semibold text-text-primary">Donation Categories</h2>
                <p className="mt-0.5 text-caption text-text-muted">
                  Manage the categories shown to staff when recording donations
                </p>
              </div>
              <Button size="sm" onClick={openCreate}>
                + Add Category
              </Button>
            </div>

            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-surface-2 animate-pulse flex-shrink-0" />
                    <div className="flex-1 h-4 bg-surface-2 rounded animate-pulse" />
                    <div className="w-16 h-6 bg-surface-2 rounded animate-pulse" />
                    <div className="w-20 h-8 bg-surface-2 rounded-full animate-pulse" />
                    <div className="w-16 h-8 bg-surface-2 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="px-5 py-10 text-center text-text-muted text-body">
                No categories yet.{' '}
                <button className="text-primary underline cursor-pointer" onClick={openCreate}>
                  Add the first one.
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={[
                      'px-5 py-4 flex items-center gap-4',
                      !cat.isActive && 'opacity-50',
                    ].join(' ')}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                      title={cat.color}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-label text-text-primary truncate">{cat.name}</p>
                      {cat.description && (
                        <p className="text-caption text-text-muted truncate">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {cat.is80gEligible && (
                        <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-green-500/10 text-green-400">
                          80G
                        </span>
                      )}
                      <span
                        className={[
                          'px-2 py-0.5 rounded-full text-caption font-medium',
                          cat.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-surface-2 text-text-muted',
                        ].join(' ')}
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <span className="text-caption text-text-muted flex-shrink-0 w-8 text-right">
                      #{cat.sortOrder}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(cat)}
                        disabled={deleteMutation.isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { void handleToggleActive(cat); }}
                        disabled={updateMutation.isPending || deleteMutation.isPending}
                      >
                        {cat.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => { void handleDelete(cat); }}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <CategoryModal
            isOpen={isModalOpen}
            onClose={closeModal}
            editing={editingCategory}
            form={form}
            onSetField={setField}
            onSubmit={() => { void handleSubmit(); }}
            isSubmitting={isSubmitting}
            errors={formErrors}
          />
        </>
      )}

      {/* Tab: Seva Types */}
      {activeTab === 'seva-types' && (
        <>
          <section className="rounded-lg bg-surface border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
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
              <div className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 h-4 bg-surface-2 rounded animate-pulse" />
                    <div className="w-20 h-6 bg-surface-2 rounded animate-pulse" />
                    <div className="w-20 h-8 bg-surface-2 rounded-full animate-pulse" />
                    <div className="w-16 h-8 bg-surface-2 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : sevaTypes.length === 0 ? (
              <div className="px-5 py-10 text-center text-text-muted text-body">
                No seva types yet.{' '}
                <button
                  className="text-primary underline cursor-pointer"
                  onClick={openCreateSeva}
                >
                  Add the first one.
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
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
                        <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-primary/10 text-primary">
                          Sankalpa
                        </span>
                      )}
                      {st.isOnlineBookable && (
                        <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-info/10 text-info">
                          Online
                        </span>
                      )}
                      <span
                        className={[
                          'px-2 py-0.5 rounded-full text-caption font-medium',
                          st.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-surface-2 text-text-muted',
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
          />
        </>
      )}

      {/* Tab: Income Categories */}
      {activeTab === 'income-cats' && (
        <FinanceCatSection
          type="INCOME"
          typeLabel="Income"
          description="Categories for manual income entries in the finance ledger"
        />
      )}

      {/* Tab: Expense Categories */}
      {activeTab === 'expense-cats' && (
        <FinanceCatSection
          type="EXPENSE"
          typeLabel="Expense"
          description="Categories for expense entries in the finance ledger"
        />
      )}

      {/* Tab: Website Integration */}
      {activeTab === 'web-integration' && (
        <section className="rounded-lg bg-surface border border-border">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[18px] font-semibold text-text-primary">Website Integration</h2>
            <p className="text-sm text-text-muted mt-0.5">
              Embed the donation and seva booking portal directly on your temple website.
            </p>
          </div>

          {!templeProfile ? (
            <div className="px-5 py-8 text-sm text-text-muted text-center">Loading temple details…</div>
          ) : (
            <div className="px-5 py-6 space-y-8">
              {/* Portal URL */}
              <div>
                <h3 className="text-[15px] font-medium text-text-primary mb-1">Public Portal URL</h3>
                <p className="text-sm text-text-muted mb-3">Share this link directly or embed it as an iframe.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-surface-2 border border-border rounded-lg px-3 py-2 font-mono break-all">
                    {window.location.origin}/portal/{templeProfile.slug}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${window.location.origin}/portal/${templeProfile.slug}`, 'url')}
                    className="flex-shrink-0 px-3 py-2 rounded-lg border border-border text-sm hover:bg-surface-2 transition-colors"
                  >
                    {copiedKey === 'url' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Full iframe */}
              <div>
                <h3 className="text-[15px] font-medium text-text-primary mb-1">Embed on Your Website</h3>
                <p className="text-sm text-text-muted mb-3">
                  Paste this code anywhere on your website to embed the donation portal.
                </p>
                <div className="relative">
                  <pre className="text-xs bg-surface-2 border border-border rounded-lg px-4 py-3 font-mono whitespace-pre-wrap break-all leading-relaxed">
{`<iframe
  src="${window.location.origin}/portal/${templeProfile.slug}"
  width="100%"
  height="700"
  style="border:none;border-radius:12px;max-width:480px;"
  title="${templeProfile.name} — Donate & Book Seva"
></iframe>`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      `<iframe\n  src="${window.location.origin}/portal/${templeProfile.slug}"\n  width="100%"\n  height="700"\n  style="border:none;border-radius:12px;max-width:480px;"\n  title="${templeProfile.name} — Donate &amp; Book Seva"\n></iframe>`,
                      'iframe',
                    )}
                    className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-white border border-border text-xs hover:bg-surface-2 transition-colors shadow-sm"
                  >
                    {copiedKey === 'iframe' ? '✓ Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>

              {/* Donate only */}
              <div>
                <h3 className="text-[15px] font-medium text-text-primary mb-1">Donations-Only Embed</h3>
                <p className="text-sm text-text-muted mb-3">Opens directly on the Donate tab.</p>
                <div className="relative">
                  <pre className="text-xs bg-surface-2 border border-border rounded-lg px-4 py-3 font-mono whitespace-pre-wrap break-all leading-relaxed">
{`<iframe
  src="${window.location.origin}/portal/${templeProfile.slug}?tab=donate"
  width="100%"
  height="680"
  style="border:none;border-radius:12px;max-width:480px;"
  title="${templeProfile.name} — Donate"
></iframe>`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      `<iframe\n  src="${window.location.origin}/portal/${templeProfile.slug}?tab=donate"\n  width="100%"\n  height="680"\n  style="border:none;border-radius:12px;max-width:480px;"\n  title="${templeProfile.name} — Donate"\n></iframe>`,
                      'donate',
                    )}
                    className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-white border border-border text-xs hover:bg-surface-2 transition-colors shadow-sm"
                  >
                    {copiedKey === 'donate' ? '✓ Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>

              {/* Seva only */}
              <div>
                <h3 className="text-[15px] font-medium text-text-primary mb-1">Seva Booking-Only Embed</h3>
                <p className="text-sm text-text-muted mb-3">Opens directly on the Book Seva tab.</p>
                <div className="relative">
                  <pre className="text-xs bg-surface-2 border border-border rounded-lg px-4 py-3 font-mono whitespace-pre-wrap break-all leading-relaxed">
{`<iframe
  src="${window.location.origin}/portal/${templeProfile.slug}?tab=seva"
  width="100%"
  height="720"
  style="border:none;border-radius:12px;max-width:480px;"
  title="${templeProfile.name} — Book Seva"
></iframe>`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      `<iframe\n  src="${window.location.origin}/portal/${templeProfile.slug}?tab=seva"\n  width="100%"\n  height="720"\n  style="border:none;border-radius:12px;max-width:480px;"\n  title="${templeProfile.name} — Book Seva"\n></iframe>`,
                      'seva',
                    )}
                    className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-white border border-border text-xs hover:bg-surface-2 transition-colors shadow-sm"
                  >
                    {copiedKey === 'seva' ? '✓ Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Note:</span> Online payments require Razorpay to be configured for your temple. Sevas appear only if marked as "Online Bookable" in the Seva Types tab.
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
