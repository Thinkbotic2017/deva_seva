import { type SelectHTMLAttributes, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

/**
 * Select — styled native select element.
 * Label is always above the field (CLAUDE.md rule).
 */
export function Select({ label, options, placeholder, error, id: propId, className = '', ...rest }: SelectProps) {
  const generatedId = useId();
  const id = propId ?? generatedId;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label text-text-secondary">
        {label}
      </label>
      <select
        id={id}
        className={[
          'h-12 rounded-md border bg-surface px-3 text-body text-text-primary',
          'transition-colors duration-150 outline-none appearance-none',
          'focus:ring-2 focus:ring-primary focus:border-primary',
          error ? 'border-danger' : 'border-border hover:border-text-muted',
          className,
        ].join(' ')}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-caption text-danger mt-0.5">{error}</p>
      )}
    </div>
  );
}
