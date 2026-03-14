import { Link } from 'react-router-dom';
import {
  IndianRupee, Flame, Users, BookOpen, MessageCircle, BarChart3,
  Check, ArrowRight, Globe,
} from 'lucide-react';
import { WebsiteLayout } from './components/WebsiteLayout';
import { WebsiteSEO } from './components/WebsiteSEO';

interface FeatureSection {
  icon: React.ElementType;
  title: string;
  desc: string;
  bullets: string[];
  flip?: boolean;
}

const sections: FeatureSection[] = [
  {
    icon: IndianRupee,
    title: 'Donation Management',
    desc: 'Record every rupee with full audit trails. From cash at the counter to online Razorpay payments — all unified.',
    bullets: [
      'Cash, UPI, NEFT, cheque, and online donation modes',
      'Auto-generated receipt numbers per fiscal year',
      '80G eligibility per donation category',
      'Category colour coding for quick identification',
      'Razorpay integration for online donations',
      'Fund allocation — ring-fence money for specific uses',
    ],
  },
  {
    icon: Flame,
    title: 'Seva Booking',
    desc: 'Manage your full seva catalog with pricing tiers, slot availability, and online booking via your public portal.',
    bullets: [
      'Unlimited seva types with Hindi name support',
      'Multiple pricing tiers per seva (Silver, Gold, Diamond)',
      'Time slot management with max-booking limits',
      'Day-sheet view for priest scheduling',
      'Sankalpa name, gotra, and nakshatra capture',
      'Online booking via public portal — no staff needed',
    ],
    flip: true,
  },
  {
    icon: Users,
    title: 'Devotee Records',
    desc: 'Build a living CRM of your devotees. Phone-based lookup, family profiles, and lifetime giving at a glance.',
    bullets: [
      'Phone-based lookup with zero manual entry',
      'Complete donation and seva history',
      'Lifetime giving amount and donation count',
      'Gotra, nakshatra, rashi, and family profiles',
      'Birthday and anniversary reminders',
      'Devotee tier classification (Regular, Patron, VIP)',
    ],
  },
  {
    icon: BookOpen,
    title: 'Finance & Reports',
    desc: 'A complete, append-only finance ledger that auto-posts every donation and expense. No reconciliation needed.',
    bullets: [
      'Auto-posted ledger entries for every donation',
      'Manual income and expense entry',
      'Fund balance tracking (calculated live, never stale)',
      '80G summary reports for the full fiscal year',
      'Monthly PDF reports with income/expense breakdown',
      'Trustee approval flow for expenses above ₹5,000',
    ],
    flip: true,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Notifications',
    desc: 'Devotees get instant WhatsApp messages at every step — no manual sending, no delays.',
    bullets: [
      'Instant 80G receipt PDF on WhatsApp after donation',
      'Seva booking confirmation with date and time',
      'WhatsApp reminder 24 hours before seva',
      'Birthday and anniversary greetings',
      'Powered by Gupshup Business Service Provider',
      'Opt-out support per devotee',
    ],
  },
  {
    icon: Globe,
    title: 'Public Donation Portal',
    desc: 'Every temple gets a shareable devotee-facing page. Devotees can donate and book sevas without creating an account.',
    bullets: [
      'Unique URL per temple (/portal/your-temple)',
      'Online donations with Razorpay checkout',
      'Seva booking with slot selection',
      'Mobile-first responsive design',
      'Embeddable via iframe on your existing website',
      'No login required for devotees',
    ],
    flip: true,
  },
];

export function WebsiteFeaturesPage() {
  return (
    <WebsiteLayout>
      <WebsiteSEO
        title="Features"
        description="DevaSeva features: donation management, seva booking, devotee CRM, finance ledger, WhatsApp notifications, and a public donation portal for Indian temples."
        canonical="https://devaseva.in/features"
      />

      {/* ── Page header ─────────────────────────────────────────────── */}
      <section
        className="relative py-20 px-4 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, hsl(var(--brand-primary) / 0.06) 0%, hsl(var(--gold-accent) / 0.06) 100%)',
        }}
        aria-labelledby="features-page-heading"
      >
        <div className="max-w-3xl mx-auto">
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-primary text-sm font-medium">
            <BarChart3 size={14} aria-hidden="true" />
            Full Feature List
          </div>
          <h1 id="features-page-heading" className="text-h1 font-bold text-text-primary mb-4" style={{ fontSize: '2.25rem', lineHeight: '1.2' }}>
            Everything Your Temple Needs
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed max-w-2xl mx-auto">
            Every feature in DevaSeva was designed around one workflow: a donation is recorded → a receipt reaches the devotee's WhatsApp in under 30 seconds.
          </p>
        </div>
      </section>

      {/* ── Feature sections ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {sections.map(({ icon: Icon, title, desc, bullets, flip }, idx) => (
          <section
            key={title}
            className={[
              'py-16 flex flex-col gap-10',
              idx < sections.length - 1 ? 'border-b border-border-subtle' : '',
              'lg:flex-row lg:items-center lg:gap-16',
              flip ? 'lg:flex-row-reverse' : '',
            ].join(' ')}
            aria-labelledby={`feature-${idx}`}
          >
            {/* Feature card */}
            <div className="flex-1">
              <div className="bg-bg-surface border border-border-subtle rounded-xl p-8 h-full">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-5">
                  <Icon size={24} className="text-brand-primary" aria-hidden="true" />
                </div>
                <h2 id={`feature-${idx}`} className="text-h2 font-bold text-text-primary mb-3">
                  {title}
                </h2>
                <p className="text-text-secondary leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2.5" role="list">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <Check size={16} className="text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Decorative side panel */}
            <div className="flex-1 lg:max-w-[420px]">
              <div
                className="rounded-xl p-6 border border-white/20 min-h-[220px] flex flex-col justify-between"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--brand-primary) / 0.12) 0%, hsl(var(--gold-accent) / 0.10) 100%)',
                }}
                aria-hidden="true"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-brand-primary rounded-lg flex items-center justify-center">
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="font-semibold text-text-primary text-sm">{title}</span>
                </div>
                <div className="space-y-2">
                  {bullets.slice(0, 3).map((b) => (
                    <div key={b} className="flex items-center gap-2 bg-bg-surface/70 rounded-lg px-3 py-2">
                      <Check size={13} className="text-success flex-shrink-0" />
                      <span className="text-xs text-text-secondary truncate">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section
        className="py-16 px-4 text-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--gold-accent)) 100%)',
        }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Ready to see it in action?
        </h2>
        <p className="text-white/80 mb-8 max-w-lg mx-auto">
          Start your free trial today — no credit card required.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-brand-primary font-bold rounded-full hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
        >
          Get Started Free
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </WebsiteLayout>
  );
}
