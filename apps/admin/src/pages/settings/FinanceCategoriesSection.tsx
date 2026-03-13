import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  useFinanceCategoriesAdmin,
  useCreateFinanceCategory,
  useUpdateFinanceCategory,
  useDeleteFinanceCategory,
  type FinanceCategory,
  type CreateFinanceCategoryDto,
} from '@/api/finance.api';

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceCatForm {
  name: string;
  sortOrder: number;
  color: string;
}

const EMPTY_FINANCE_FORM: FinanceCatForm = { name: '', sortOrder: 0, color: '#6366F1' };

// ─── Modal ────────────────────────────────────────────────────────────────────

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
}: FinanceCatModalProps): JSX.Element {
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

// ─── Inner section (shared for Income + Expense) ───────────────────────────

interface FinanceCatSectionProps {
  type: 'INCOME' | 'EXPENSE';
  typeLabel: string;
  description: string;
}

function FinanceCatSection({ type, typeLabel, description }: FinanceCatSectionProps): JSX.Element {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [form, setForm] = useState<FinanceCatForm>(EMPTY_FINANCE_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FinanceCatForm, string>>>({});

  const { data: categories = [], isLoading } = useFinanceCategoriesAdmin(type);
  const createMutation = useCreateFinanceCategory();
  const updateMutation = useUpdateFinanceCategory();
  const deleteMutation = useDeleteFinanceCategory();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function setField<K extends keyof FinanceCatForm>(key: K, value: FinanceCatForm[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function openCreate(): void {
    setEditing(null);
    setForm(EMPTY_FINANCE_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(cat: FinanceCategory): void {
    setEditing(cat);
    setForm({ name: cat.name, sortOrder: cat.sortOrder, color: cat.color ?? '#6366F1' });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal(): void {
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

  async function handleSubmit(): Promise<void> {
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

  async function handleToggleActive(cat: FinanceCategory): Promise<void> {
    if (cat.isSystem) return; // system categories are immutable
    if (cat.isActive) {
      const confirmed = window.confirm(
        `Deactivate "${cat.name}"? It will no longer appear in the finance entry form.`,
      );
      if (!confirmed) return;
    }
    await updateMutation.mutateAsync({ id: cat.id, dto: { isActive: !cat.isActive } });
  }

  async function handleDelete(cat: FinanceCategory): Promise<void> {
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
      <section className="rounded-lg bg-bg-surface border border-border-subtle">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-h3 font-semibold text-text-primary">{typeLabel} Categories</h2>
            <p className="mt-0.5 text-caption text-text-muted">{description}</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            + Add Category
          </Button>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border-subtle">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`skeleton-category-${i}`} className="px-5 py-4 flex items-center gap-4">
                <div className="w-4 h-4 bg-bg-surface-2 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 h-4 bg-bg-surface-2 rounded animate-pulse" />
                <div className="w-16 h-6 bg-bg-surface-2 rounded animate-pulse" />
                <div className="w-20 h-8 bg-bg-surface-2 rounded-full animate-pulse" />
                <div className="w-16 h-8 bg-bg-surface-2 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="px-5 py-10 text-center text-text-muted text-body">
            No categories yet.{' '}
            <button className="text-brand-primary underline cursor-pointer" onClick={openCreate}>
              Add the first one.
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
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
                    <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-bg-surface-2 text-text-muted">
                      System
                    </span>
                  )}
                  <span
                    className={[
                      'px-2 py-0.5 rounded-full text-caption font-medium',
                      cat.isActive
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'bg-bg-surface-2 text-text-muted',
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

// ─── Public exports ───────────────────────────────────────────────────────────

/**
 * Income categories CRUD section for the Settings page.
 */
export function IncomeCategoriesSection(): JSX.Element {
  return (
    <FinanceCatSection
      type="INCOME"
      typeLabel="Income"
      description="Categories for manual income entries in the finance ledger"
    />
  );
}

/**
 * Expense categories CRUD section for the Settings page.
 */
export function ExpenseCategoriesSection(): JSX.Element {
  return (
    <FinanceCatSection
      type="EXPENSE"
      typeLabel="Expense"
      description="Categories for expense entries in the finance ledger"
    />
  );
}
