import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  useDonationCategoriesAdmin,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type DonationCategory,
  type CreateDonationCategoryDto,
} from '@/api/donations.api';

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

// ─── Modal ────────────────────────────────────────────────────────────────────

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
}: CategoryModalProps): JSX.Element {
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
              'rounded-md bg-bg-surface-2 px-4 py-3 text-body text-text-primary resize-none',
              'border border-border-subtle hover:border-text-muted transition-colors duration-150',
              'focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-bg-surface',
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
              form.is80gEligible ? 'bg-brand-primary' : 'bg-bg-surface-2 border border-border-subtle',
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

// ─── Section ──────────────────────────────────────────────────────────────────

/**
 * Self-contained CRUD section for donation categories.
 * Manages its own modal state, form state, and API mutations.
 */
export function DonationCategoriesSection(): JSX.Element {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DonationCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CategoryForm, string>>>({});

  const { data: categories = [], isLoading } = useDonationCategoriesAdmin();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function setField<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function openCreate(): void {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(category: DonationCategory): void {
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

  function closeModal(): void {
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

  async function handleSubmit(): Promise<void> {
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

  async function handleToggleActive(category: DonationCategory): Promise<void> {
    if (category.isActive) {
      const confirmed = window.confirm(
        `Deactivate "${category.name}"? It will no longer appear in the donation form.`,
      );
      if (!confirmed) return;
    }
    await updateMutation.mutateAsync({ id: category.id, dto: { isActive: !category.isActive } });
  }

  async function handleDelete(category: DonationCategory): Promise<void> {
    const confirmed = window.confirm(
      `Permanently remove "${category.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    await deleteMutation.mutateAsync(category.id);
  }

  return (
    <>
      <section className="rounded-lg bg-bg-surface border border-border-subtle">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
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
          <div className="divide-y divide-border-subtle">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`skeleton-finance-cat-${i}`} className="px-5 py-4 flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-bg-surface-2 animate-pulse flex-shrink-0" />
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
                    <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-success-subtle text-success-fg">
                      80G
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
  );
}
