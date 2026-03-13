import { useTempleProfile } from '@/api/temple.api';

/**
 * Temple profile summary section for the Settings page.
 * Displays the temple's core details fetched from the API.
 *
 * NOTE: Full editable form is pending (Phase 9 — temple profile editing).
 */
export function TempleProfileSection(): JSX.Element {
  const { data: templeProfile, isLoading } = useTempleProfile();

  if (isLoading) {
    return (
      <section className="rounded-lg bg-bg-surface border border-border-subtle">
        <div className="px-5 py-4 border-b border-border-subtle">
          <div className="h-5 w-40 bg-bg-surface-2 rounded animate-pulse" />
          <div className="mt-1.5 h-4 w-64 bg-bg-surface-2 rounded animate-pulse" />
        </div>
        <div className="px-5 py-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-profile-${i}`} className="h-10 bg-bg-surface-2 rounded-md animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!templeProfile) {
    return (
      <section className="rounded-lg bg-bg-surface border border-border-subtle">
        <div className="px-5 py-8 text-center text-text-muted text-body">
          Unable to load temple profile.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-bg-surface border border-border-subtle">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h2 className="text-h3 font-semibold text-text-primary">Temple Profile</h2>
        <p className="mt-0.5 text-caption text-text-muted">
          Temple name, address, contact information, and plan details
        </p>
      </div>
      <div className="px-5 py-6 space-y-0 divide-y divide-border-subtle">
        <div className="flex items-center gap-3 py-3">
          <span className="text-label text-text-muted w-36 flex-shrink-0">Name</span>
          <span className="text-body text-text-primary">{templeProfile.name}</span>
        </div>
        <div className="flex items-center gap-3 py-3">
          <span className="text-label text-text-muted w-36 flex-shrink-0">Slug</span>
          <span className="text-body text-text-primary font-mono">{templeProfile.slug}</span>
        </div>
        {templeProfile.city && (
          <div className="flex items-center gap-3 py-3">
            <span className="text-label text-text-muted w-36 flex-shrink-0">City</span>
            <span className="text-body text-text-primary">
              {templeProfile.city}
              {templeProfile.state && `, ${templeProfile.state}`}
            </span>
          </div>
        )}
        {templeProfile.phone && (
          <div className="flex items-center gap-3 py-3">
            <span className="text-label text-text-muted w-36 flex-shrink-0">Phone</span>
            <span className="text-body text-text-primary">{templeProfile.phone}</span>
          </div>
        )}
        {templeProfile.email && (
          <div className="flex items-center gap-3 py-3">
            <span className="text-label text-text-muted w-36 flex-shrink-0">Email</span>
            <span className="text-body text-text-primary">{templeProfile.email}</span>
          </div>
        )}
        <div className="flex items-center gap-3 py-3">
          <span className="text-label text-text-muted w-36 flex-shrink-0">80G Registered</span>
          <span
            className={[
              'px-2 py-0.5 rounded-full text-caption font-medium',
              templeProfile.is80gRegistered
                ? 'bg-success-subtle text-success-fg'
                : 'bg-bg-surface-2 text-text-muted',
            ].join(' ')}
          >
            {templeProfile.is80gRegistered ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center gap-3 py-3">
          <span className="text-label text-text-muted w-36 flex-shrink-0">Plan</span>
          <span className="px-2 py-0.5 rounded-full text-caption font-medium bg-brand-primary/10 text-brand-primary">
            {templeProfile.plan}
          </span>
        </div>
      </div>
    </section>
  );
}
