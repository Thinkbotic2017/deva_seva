import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Optional secondary line below value */
  sub?: string;
  icon?: ReactNode;
  /** Accent color class for the icon background, e.g. 'bg-primary/10 text-primary' */
  iconColor?: string;
  loading?: boolean;
}

/**
 * StatCard — displays a single KPI metric on the dashboard.
 * Adheres to surface-2 elevated card style with subtle border.
 */
export function StatCard({ label, value, sub, icon, iconColor = 'bg-primary/10 text-primary', loading }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl bg-bg-surface border border-border-subtle p-5 flex items-start gap-4"
    >
      {icon && (
        <div className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-xl ${iconColor}`}>
          {icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-caption text-text-secondary uppercase tracking-wide font-medium">
          {label}
        </p>
        {loading ? (
          <div className="mt-1.5 h-7 w-24 animate-pulse rounded bg-bg-surface-2" />
        ) : (
          <p className="mt-0.5 text-h2 text-text-primary font-bold leading-tight truncate">
            {value}
          </p>
        )}
        {sub && !loading && (
          <p className="mt-0.5 text-caption text-text-muted">{sub}</p>
        )}
      </div>
    </motion.div>
  );
}
