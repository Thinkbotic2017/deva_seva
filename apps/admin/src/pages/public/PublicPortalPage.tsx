import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Heart, Sparkles, Shield, FileCheck, MessageCircle } from 'lucide-react';
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
          <p className="text-danger font-medium mb-2">Temple not found</p>
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

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden pt-10 pb-12 px-4 text-center"
        style={{
          background: 'linear-gradient(150deg, hsl(var(--brand-primary)) 0%, hsl(var(--gold-accent)) 100%)',
        }}
      >
        {/* Dot-grid decoration */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Temple avatar */}
        <div
          className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 ring-2 ring-white/50 mb-4 select-none"
          aria-hidden="true"
        >
          <span className="text-white font-bold text-2xl">{temple.name.charAt(0)}</span>
        </div>

        <h1 className="relative text-h2 font-bold text-white mb-1">{temple.name}</h1>
        <p className="relative text-white/75 text-sm">Online Donations & Seva Booking</p>
      </div>

      {/* ── Tab bar — floats up over hero bottom edge ─────────────────────── */}
      <div className="flex justify-center -mt-5 px-4 relative z-10">
        <div
          className="flex gap-1 p-1 bg-bg-surface rounded-full border border-border-subtle shadow-card w-full max-w-sm"
          role="tablist"
          aria-label="Portal sections"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'donate'}
            onClick={() => setActiveTab('donate')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full',
              'text-sm font-semibold transition-all duration-200 cursor-pointer',
              activeTab === 'donate'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            <Heart size={14} aria-hidden="true" />
            Donate
          </button>

          {showSevaTab && (
            <button
              role="tab"
              aria-selected={activeTab === 'seva'}
              onClick={() => setActiveTab('seva')}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full',
                'text-sm font-semibold transition-all duration-200 cursor-pointer',
                activeTab === 'seva'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              <Sparkles size={14} aria-hidden="true" />
              Book Seva
            </button>
          )}
        </div>
      </div>

      {/* ── Tab content — tab components own their own card wrapper ──────── */}
      <div className="pt-5 pb-6 px-4">
        {activeTab === 'donate' ? (
          <PublicDonateTab temple={temple} categories={categories} />
        ) : (
          <PublicSevaTab temple={temple} sevaTypes={sevaTypes} />
        )}
      </div>

      {/* ── Trust footer ─────────────────────────────────────────────────── */}
      <div className="pb-8 px-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap justify-center">
          <span className="flex items-center gap-1">
            <Shield size={11} aria-hidden="true" />
            Secure Payment
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <FileCheck size={11} aria-hidden="true" />
            80G Receipt
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <MessageCircle size={11} aria-hidden="true" />
            WhatsApp Confirmation
          </span>
        </div>
        <p className="text-xs text-text-muted">
          Powered by <span className="text-brand-primary font-medium">DevaSeva</span>
        </p>
      </div>
    </div>
  );
}
