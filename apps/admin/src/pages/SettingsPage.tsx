import { useState } from 'react';
import { DonationCategoriesSection } from '@/pages/settings/DonationCategoriesSection';
import { SevaTypesSection } from '@/pages/settings/SevaTypesSection';
import {
  IncomeCategoriesSection,
  ExpenseCategoriesSection,
} from '@/pages/settings/FinanceCategoriesSection';
import { WebIntegrationSection } from '@/pages/settings/WebIntegrationSection';

// ─── Tab definition ───────────────────────────────────────────────────────────

type Tab = 'donation-cats' | 'seva-types' | 'income-cats' | 'expense-cats' | 'web-integration';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'donation-cats',   label: 'Donation Categories' },
  { id: 'seva-types',      label: 'Seva Types'          },
  { id: 'income-cats',     label: 'Income Categories'   },
  { id: 'expense-cats',    label: 'Expense Categories'  },
  { id: 'web-integration', label: 'Website Integration' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Settings page — thin parent that owns only the active tab state.
 * All section-level state, API hooks, and mutations live inside the section components.
 */
export function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('donation-cats');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-h1 font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-body text-text-muted">Temple configuration and management</p>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1">
        <div className="flex gap-1 p-1 rounded-lg bg-bg-surface-2 w-fit min-w-full sm:min-w-0 mx-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-4 py-2 rounded-md text-label transition-colors duration-150 flex-shrink-0',
                activeTab === tab.id
                  ? 'bg-bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Donation Categories */}
      {activeTab === 'donation-cats' && <DonationCategoriesSection />}

      {/* Tab: Seva Types */}
      {activeTab === 'seva-types' && <SevaTypesSection />}

      {/* Tab: Income Categories */}
      {activeTab === 'income-cats' && <IncomeCategoriesSection />}

      {/* Tab: Expense Categories */}
      {activeTab === 'expense-cats' && <ExpenseCategoriesSection />}

      {/* Tab: Website Integration */}
      {activeTab === 'web-integration' && <WebIntegrationSection />}
    </div>
  );
}
