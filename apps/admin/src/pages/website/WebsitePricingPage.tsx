import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { WebsiteLayout } from './components/WebsiteLayout';
import { WebsiteSEO } from './components/WebsiteSEO';

const plans = [
  {
    name: 'Starter',
    price: 4999,
    period: '/month + GST',
    tagline: 'For small temples and mandirs getting started.',
    features: [
      'Up to 500 donations/month',
      'Cash & UPI donations',
      'Seva booking management',
      'WhatsApp receipt delivery',
      'Devotee phone lookup',
      'Basic finance ledger',
      'Monthly PDF reports',
      'Email support',
    ],
    notIncluded: ['Online donation portal', 'Devotee CRM', 'Advanced analytics', '80G bulk reports'],
    cta: 'Get Started',
  },
  {
    name: 'Professional',
    price: 9999,
    period: '/month + GST',
    tagline: 'The most complete plan for mid-size temples.',
    features: [
      'Unlimited donations',
      'Online donation portal (Razorpay)',
      'Full devotee CRM & history',
      'All payment modes (Cash/UPI/Card/Online)',
      '80G receipt generation',
      '80G bulk reports per fiscal year',
      'Advanced analytics & charts',
      'Fund allocation management',
      'Birthday & anniversary greetings',
      'Priority support',
    ],
    notIncluded: ['Multi-temple support', 'Dedicated account manager'],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    price: 19999,
    period: '/month + GST',
    tagline: 'For large temple complexes and trusts.',
    features: [
      'Everything in Professional',
      'Multi-temple management',
      'FCRA compliance support',
      'Custom report builder',
      'Inventory management',
      'Vendor management',
      'Dedicated account manager',
      'Phone & WhatsApp support',
      'SLA: 4-hour response time',
      'API access for integrations',
    ],
    notIncluded: [],
    cta: 'Contact Us',
    ctaTo: '/contact',
  },
];

function fmtINR(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

const faqs: { q: string; a: string }[] = [
  {
    q: 'Is my temple\'s data secure?',
    a: 'Yes. All data is stored in a multi-tenant PostgreSQL database where each temple\'s data is strictly isolated. PAN numbers are encrypted with AES-256-GCM. S3 receipts use pre-signed URLs with 1-hour TTL. We follow OWASP security best practices.',
  },
  {
    q: 'Can devotees book sevas without creating an account?',
    a: 'Absolutely. Your public portal page allows devotees to donate and book sevas using just their name and phone number — no account or login required. Booking confirmations are sent directly to their WhatsApp.',
  },
  {
    q: 'Does DevaSeva support multiple temples?',
    a: 'The Enterprise plan supports multi-temple management under a single trust. Each temple has its own isolated data, users, and settings. The Starter and Professional plans support one temple per account.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'DevaSeva supports Cash, UPI, Card, NEFT, Cheque, Demand Draft, and online Razorpay payments. Counter staff can record any mode; devotees using the public portal pay via Razorpay (UPI, cards, net banking).',
  },
  {
    q: 'Is 80G receipt generation automatic?',
    a: '80G-compliant PDF receipts are generated automatically after every confirmed donation. The receipt is uploaded to secure cloud storage and sent to the devotee\'s WhatsApp — typically within 30 seconds of payment confirmation.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border-subtle rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-bg-surface-2 transition-colors cursor-pointer focus-ring"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-semibold text-text-primary text-sm sm:text-base">{q}</span>
        {open
          ? <ChevronUp size={18} className="text-text-muted flex-shrink-0" aria-hidden="true" />
          : <ChevronDown size={18} className="text-text-muted flex-shrink-0" aria-hidden="true" />
        }
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed border-t border-border-subtle pt-4 animate-fade-in">
          {a}
        </div>
      )}
    </div>
  );
}

export function WebsitePricingPage() {
  return (
    <WebsiteLayout>
      <WebsiteSEO
        title="Pricing"
        description="DevaSeva pricing: Starter ₹4,999/month, Professional ₹9,999/month, Enterprise ₹19,999/month. Simple, transparent pricing for Indian temples."
        canonical="https://devaseva.in/pricing"
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 text-center"
        style={{
          background: 'linear-gradient(160deg, hsl(var(--brand-primary) / 0.06) 0%, hsl(var(--gold-accent) / 0.06) 100%)',
        }}
        aria-labelledby="pricing-page-heading"
      >
        <div className="max-w-2xl mx-auto">
          <h1 id="pricing-page-heading" className="text-h1 font-bold text-text-primary mb-3" style={{ fontSize: '2.25rem', lineHeight: '1.2' }}>
            Simple, Transparent Pricing
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed">
            No hidden fees. No contracts. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── Pricing cards ────────────────────────────────────────────── */}
      <section
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        aria-label="Pricing plans"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map(({ name, price, period, tagline, features, notIncluded, popular, cta, ctaTo }) => (
            <article
              key={name}
              className={[
                'relative bg-bg-surface border rounded-2xl p-6 flex flex-col',
                popular
                  ? 'border-brand-primary ring-2 ring-brand-primary/25 shadow-modal'
                  : 'border-border-subtle shadow-card',
              ].join(' ')}
            >
              {popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-full shadow-sm whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <header className="mb-5">
                <h2 className="text-xl font-bold text-text-primary mb-1">{name}</h2>
                <p className="text-xs text-text-muted mb-4">{tagline}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-text-primary">₹{fmtINR(price)}</span>
                  <span className="text-sm text-text-muted mb-1">{period}</span>
                </div>
              </header>

              <Link
                to={ctaTo ?? '/login'}
                className={[
                  'block text-center py-3 rounded-full text-sm font-bold transition-all duration-150 cursor-pointer mb-6',
                  popular
                    ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-[0.98]'
                    : 'border border-border-default text-text-primary hover:border-brand-primary/50 hover:text-brand-primary',
                ].join(' ')}
              >
                {cta}
              </Link>

              <div className="space-y-1.5 flex-1">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Included</p>
                {features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <CheckCircle size={14} className="text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {f}
                  </div>
                ))}
                {notIncluded.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mt-4 mb-2">Not included</p>
                    {notIncluded.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm text-text-muted opacity-60">
                        <span className="mt-0.5 flex-shrink-0 w-3.5 text-center text-text-muted" aria-hidden="true">—</span>
                        {f}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-text-muted">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
        aria-labelledby="faq-heading"
      >
        <h2 id="faq-heading" className="text-h1 font-bold text-text-primary text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map(({ q, a }) => (
            <FAQItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section
        className="py-16 px-4 text-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--gold-accent)) 100%)',
        }}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Still have questions?</h2>
        <p className="text-white/80 mb-8">Our team responds within 24 hours.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/15 border border-white/30 text-white font-semibold rounded-full hover:bg-white/25 transition-all cursor-pointer"
          >
            Contact Us
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-brand-primary font-bold rounded-full hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
          >
            Start Free Trial
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </WebsiteLayout>
  );
}
