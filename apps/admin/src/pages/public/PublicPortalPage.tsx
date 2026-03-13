import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublicPortalData } from '@/api/public.api';
import type { PublicPortalData } from '@/api/public.api';
import { PublicDonateTab } from './PublicDonateTab';
import { PublicSevaTab } from './PublicSevaTab';

type Tab = 'donate' | 'seva';

/**
 * PublicPortalPage — the iframe-embeddable donation and seva portal.
 * Route: /portal/:slug (no auth required, outside ProtectedRoute)
 *
 * Follows the admin theme via CSS tokens. Reads localStorage key 'theme'
 * and system preference to apply the dark class before first render.
 */
export function PublicPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PublicPortalData | null>(null);
  const [loadError, setLoadError] = useState('');
  const initialTab = (searchParams.get('tab') === 'seva' ? 'seva' : 'donate') as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Sync dark class with saved preference or system preference.
  // The portal has no theme toggle, so it follows the stored setting.
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    getPublicPortalData(slug)
      .then(setData)
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load temple data');
      });
  }, [slug]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-danger-fg font-medium mb-2">Temple not found</p>
          <p className="text-text-muted text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { temple, categories, sevaTypes } = data;
  const showSevaTab = sevaTypes.length > 0;

  return (
    <div className="min-h-screen bg-bg-page text-text-primary">

      {/* Header */}
      <div className="text-center pt-8 pb-4 px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary text-white font-bold text-lg mb-3">
          {temple.name.charAt(0)}
        </div>
        <h1 className="text-xl font-bold text-text-primary">{temple.name}</h1>
        <p className="text-sm text-text-muted mt-1">Online Donations & Seva Booking</p>
      </div>

      {/* Tab bar */}
      <div className="flex justify-center my-6 px-4">
        <div className="flex gap-1 p-1 bg-bg-surface-3 rounded-full border border-border-subtle w-full max-w-sm">
          <button
            onClick={() => setActiveTab('donate')}
            className={`flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-200 ${
              activeTab === 'donate'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Donate
          </button>
          {showSevaTab && (
            <button
              onClick={() => setActiveTab('seva')}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === 'seva'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Book Seva
            </button>
          )}
        </div>
      </div>

      {/* Content — tab components own their own card wrapper */}
      <div className="py-6 px-4">
        {activeTab === 'donate' ? (
          <PublicDonateTab temple={temple} categories={categories} />
        ) : (
          <PublicSevaTab temple={temple} sevaTypes={sevaTypes} />
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-text-muted pb-8">
        Powered by <span className="text-brand-primary font-medium">DevaSeva</span>
      </p>
    </div>
  );
}
