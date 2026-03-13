import { useState, useCallback } from 'react';
import { useTempleProfile } from '@/api/temple.api';

/**
 * Website Integration section for the Settings page.
 * Shows public portal URL, full iframe embed code, donate-only embed,
 * and seva-only embed with one-click copy functionality.
 */
export function WebIntegrationSection(): JSX.Element {
  const { data: templeProfile } = useTempleProfile();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, key: string): void => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }, []);

  return (
    <section className="rounded-lg bg-bg-surface border border-border-subtle">
      <div className="px-5 py-4 border-b border-border-subtle">
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
              <code className="flex-1 text-xs bg-bg-surface-2 border border-border-subtle rounded-lg px-3 py-2 font-mono break-all">
                {window.location.origin}/portal/{templeProfile.slug}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(`${window.location.origin}/portal/${templeProfile.slug}`, 'url')}
                className="flex-shrink-0 px-3 py-2 rounded-lg border border-border-subtle text-sm hover:bg-bg-surface-2 transition-colors text-text-primary"
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
              <pre className="text-xs bg-bg-surface-2 border border-border-subtle rounded-lg px-4 py-3 font-mono whitespace-pre-wrap break-all leading-relaxed text-text-primary">
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
                className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-primary hover:bg-bg-surface-2 transition-colors shadow-sm"
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
              <pre className="text-xs bg-bg-surface-2 border border-border-subtle rounded-lg px-4 py-3 font-mono whitespace-pre-wrap break-all leading-relaxed text-text-primary">
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
                className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-primary hover:bg-bg-surface-2 transition-colors shadow-sm"
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
              <pre className="text-xs bg-bg-surface-2 border border-border-subtle rounded-lg px-4 py-3 font-mono whitespace-pre-wrap break-all leading-relaxed text-text-primary">
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
                className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-primary hover:bg-bg-surface-2 transition-colors shadow-sm"
              >
                {copiedKey === 'seva' ? '✓ Copied' : 'Copy Code'}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-warning-subtle border border-warning-DEFAULT/30 px-4 py-3">
            <p className="text-sm text-warning-fg">
              <span className="font-medium">Note:</span> Online payments require Razorpay to be configured for your temple. Sevas appear only if marked as "Online Bookable" in the Seva Types tab.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
