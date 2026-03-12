import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover ' +
    'shadow-sm disabled:opacity-50',
  secondary:
    'border border-primary text-primary hover:bg-primary/10 ' +
    'disabled:opacity-50',
  ghost:
    'text-text-secondary hover:text-text-primary hover:bg-surface-2 ' +
    'disabled:opacity-40',
  danger:
    'bg-danger text-white hover:bg-red-600 active:bg-red-700 ' +
    'disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-4 text-label text-[13px]',
  md: 'h-10 px-5 text-label',
  lg: 'h-12 px-6 text-label text-[15px]',
};

/**
 * Button — CLAUDE.md rule: ONE primary button per screen.
 * All buttons use pill shape (rounded-full) per component rules.
 * Uses active:scale-[0.97] for the press animation (avoids framer-motion
 * drag event type conflicts with motion.button).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-full font-medium',
          'transition-all duration-150 cursor-pointer select-none whitespace-nowrap',
          'active:scale-[0.97] disabled:active:scale-100',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
