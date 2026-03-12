import { type InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/**
 * Input — CLAUDE.md rules:
 * - Label always above the field, never placeholder-only.
 * - Focus ring: 2px solid primary.
 * - Error state: red border + red text + shake animation.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id: propId, ...rest }, ref) => {
    const generatedId = useId();
    const id = propId ?? generatedId;

    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <label
          htmlFor={id}
          className="text-label text-text-secondary"
        >
          {label}
        </label>

        <input
          ref={ref}
          id={id}
          className={[
            'h-12 rounded-md bg-surface-2 px-4 text-body text-text-primary',
            'border transition-colors duration-150 outline-none',
            'placeholder:text-text-muted',
            'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background focus:border-transparent',
            error
              ? 'border-danger animate-shake'
              : 'border-border hover:border-text-muted',
          ].join(' ')}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...rest}
        />

        {error && (
          <p id={`${id}-error`} role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${id}-hint`} className="text-caption text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
