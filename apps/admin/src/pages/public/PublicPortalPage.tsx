import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublicPortalData } from '@/api/public.api';
import type { PublicPortalData } from '@/api/public.api';
import { PublicDonateTab } from './PublicDonateTab';
import { PublicSevaTab } from './PublicSevaTab';

type Tab = 'donate' | 'seva';

// Inline styles for the root wrapper — override admin dark theme unconditionally.
const rootStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#ffffff',
  color: '#111827',
  fontFamily: 'Noto Sans, -apple-system, BlinkMacSystemFont, sans-serif',
};

/**
 * PublicPortalPage — the iframe-embeddable donation and seva portal.
 * Route: /portal/:slug (no auth required, outside ProtectedRoute)
 *
 * Uses inline styles on the outermost wrapper to escape the admin dark theme.
 */
export function PublicPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PublicPortalData | null>(null);
  const [loadError, setLoadError] = useState('');
  const initialTab = (searchParams.get('tab') === 'seva' ? 'seva' : 'donate') as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

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
      <div style={rootStyle} className="flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-medium mb-2">Temple not found</p>
          <p className="text-gray-500 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={rootStyle} className="flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { temple, categories, sevaTypes } = data;
  const showSevaTab = sevaTypes.length > 0;

  return (
    <div style={rootStyle}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {temple.logoUrl && (
            <img src={temple.logoUrl} alt={temple.name} className="w-10 h-10 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-base font-semibold text-orange-900 leading-tight">{temple.name}</h1>
            {(temple.city || temple.state) && (
              <p className="text-xs text-gray-400">{[temple.city, temple.state].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="flex rounded-full bg-white border border-gray-200 p-1 mb-6">
          <button
            onClick={() => setActiveTab('donate')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'donate'
                ? 'bg-orange-500 text-white'
                : 'text-gray-500 hover:text-orange-500'
            }`}
          >
            Donate
          </button>
          {showSevaTab && (
            <button
              onClick={() => setActiveTab('seva')}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'seva'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 hover:text-orange-500'
              }`}
            >
              Book Seva
            </button>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8">
          {activeTab === 'donate' ? (
            <PublicDonateTab temple={temple} categories={categories} />
          ) : (
            <PublicSevaTab temple={temple} sevaTypes={sevaTypes} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-6">
          Powered by <span className="text-orange-500 font-medium">DevaSeva</span>
        </p>
      </div>
    </div>
  );
}
