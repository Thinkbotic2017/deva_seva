/**
 * Badge — colour-coded status pill.
 * Maps known status/mode strings to semantic colours; falls back to neutral.
 */

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  /** If omitted, variant is inferred from the label string. */
  variant?: BadgeVariant;
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  // Donation statuses
  CONFIRMED:          'success',
  RECEIPT_GENERATED:  'info',
  RECEIPT_SENT:       'success',
  PENDING:            'warning',
  CANCELLED:          'danger',
  // Seva statuses
  PENDING_PAYMENT:    'warning',
  COMPLETED:          'success',
  NO_SHOW:            'neutral',
  // Finance
  APPROVED:           'success',
  PENDING_APPROVAL:   'warning',
  REJECTED:           'danger',
};

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger:  'bg-danger/15 text-danger',
  info:    'bg-info/15 text-info',
  neutral: 'bg-bg-surface-2 text-text-secondary',
};

export function Badge({ label, variant }: BadgeProps) {
  const resolvedVariant = variant ?? STATUS_MAP[label] ?? 'neutral';
  const formatted = label.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium ${VARIANT_CLASSES[resolvedVariant]}`}>
      {formatted}
    </span>
  );
}
