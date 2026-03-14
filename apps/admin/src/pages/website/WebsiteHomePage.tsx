import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee, Flame, Users, BookOpen, MessageCircle, BarChart3,
  CheckCircle, ArrowRight, ChevronDown,
} from 'lucide-react';
import { WebsiteLayout } from './components/WebsiteLayout';
import { WebsiteSEO } from './components/WebsiteSEO';

const features = [
  {
    icon: IndianRupee,
    title: 'Donations & 80G Receipts',
    desc: 'Record cash, UPI, and online donations. Auto-generate 80G-compliant PDF receipts on WhatsApp.',
  },
  {
    icon: Flame,
    title: 'Seva Booking',
    desc: 'Manage seva types, pricing tiers, and slot availability. Accept online bookings via public portal.',
  },
  {
    icon: Users,
    title: 'Devotee Records',
    desc: 'Phone-based devotee lookup, lifetime giving stats, seva history, and family profiles.',
  },
  {
    icon: BookOpen,
    title: 'Finance Ledger',
    desc: 'Auto-posted income entries, manual expenses, fund allocation, and fiscal year reports.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Notifications',
    desc: 'Instant receipts, booking confirmations, and seva day reminders via Gupshup BSP.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'Daily, monthly, and fiscal-year analytics. Category breakdowns and top-donor reports.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Set up your temple profile',
    desc: 'Add your temple details, donation categories, seva types, and Razorpay keys in minutes.',
  },
  {
    num: '02',
    title: 'Record donations & book sevas',
    desc: 'Counter staff can record cash donations or let devotees book online via your public portal.',
  },
  {
    num: '03',
    title: 'Auto-send WhatsApp receipts',
    desc: 'Devotees receive 80G-compliant PDF receipts on WhatsApp in under 30 seconds. Zero manual steps.',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '₹4,999',
    desc: 'For small temples getting started',
    features: ['Up to 500 donations/month', 'Seva booking', 'WhatsApp receipts', 'Basic reports'],
  },
  {
    name: 'Professional',
    price: '₹9,999',
    desc: 'Most popular for growing temples',
    features: ['Unlimited donations', 'Online donations portal', 'Devotee CRM', 'Advanced analytics', '80G bulk reports'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '₹19,999',
    desc: 'For large temple complexes',
    features: ['Multi-temple support', 'Dedicated support', 'Custom reports', 'FCRA compliance', 'API access'],
  },
];

const temples = ['Shri Ram Mandir', 'ISKCON Vrindavan', 'Siddhivinayak', 'Tirupati Balaji', 'Shirdi Sai Baba'];

export function WebsiteHomePage() {
  const featuresRef = useRef<HTMLElement>(null);

  function scrollToFeatures() {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <WebsiteLayout>
      <WebsiteSEO
        title="Temple Management, Simplified"
        description="DevaSeva helps Indian temples manage donations, seva bookings, devotees, and finances — all in one platform. Auto-generate 80G receipts on WhatsApp."
        canonical="https://devaseva.in"
      />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(150deg, hsl(var(--brand-primary)) 0%, hsl(var(--gold-accent)) 100%)',
          minHeight: '92vh',
        }}
        aria-labelledby="hero-heading"
      >
        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 flex flex-col items-center text-center">

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-white text-sm font-medium">
            <Flame size={14} aria-hidden="true" />
            Built for India's temples
          </div>

          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-3xl"
          >
            Temple Management,{' '}
            <span className="relative">
              Simplified
              <span
                className="absolute -bottom-1 left-0 right-0 h-1 bg-white/40 rounded-full"
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="mt-6 text-lg text-white/85 max-w-xl leading-relaxed">
            DevaSeva helps Indian temples manage donations, seva bookings, devotees, and finances —
            all in one platform. 80G receipts on WhatsApp in under 30 seconds.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-brand-primary font-bold rounded-full text-base hover:bg-white/90 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-lg"
            >
              Start Free Trial
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <button
              onClick={scrollToFeatures}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/15 backdrop-blur-sm text-white font-semibold rounded-full text-base border border-white/30 hover:bg-white/25 active:scale-[0.98] transition-all duration-150 cursor-pointer"
            >
              See How It Works
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Fake dashboard mockup */}
          <div className="mt-16 w-full max-w-sm sm:max-w-md">
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-5 text-left shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/80 text-sm font-medium">Today's Overview</span>
                <span className="text-white/60 text-xs">14 Mar 2026</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-white/60 text-xs mb-0.5">Donations</p>
                  <p className="text-white font-bold text-xl">₹6,900</p>
                  <p className="text-white/60 text-xs mt-0.5">3 today</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-white/60 text-xs mb-0.5">Seva Bookings</p>
                  <p className="text-white font-bold text-xl">8</p>
                  <p className="text-white/60 text-xs mt-0.5">2 pending</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs">Latest donation</p>
                  <p className="text-white text-sm font-medium mt-0.5">Ramesh Kumar — ₹2,100</p>
                </div>
                <div className="bg-success/80 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  Receipt Sent
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50" aria-hidden="true">
          <ChevronDown size={20} className="animate-bounce" />
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────── */}
      <section className="py-10 bg-bg-surface border-b border-border-subtle" aria-label="Trusted temples">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-text-muted mb-4">Trusted by temples across India</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {temples.map((name) => (
              <span
                key={name}
                className="px-4 py-1.5 bg-bg-surface-2 border border-border-subtle rounded-full text-sm text-text-secondary font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────── */}
      <section
        ref={featuresRef}
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="features-heading"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 id="features-heading" className="text-h1 font-bold text-text-primary mb-3">
              Everything your temple needs
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto leading-relaxed">
              From daily donations to annual 80G reports — DevaSeva handles it all so your staff can focus on devotees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <article
                key={title}
                className="bg-bg-surface border border-border-subtle rounded-xl p-6 hover:border-brand-primary/40 hover:shadow-card transition-all duration-200"
              >
                <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon size={20} className="text-brand-primary" aria-hidden="true" />
                </div>
                <h3 className="text-h3 font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </article>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-brand-primary font-semibold hover:underline cursor-pointer"
            >
              See all features
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 bg-bg-surface-2"
        aria-labelledby="how-it-works-heading"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 id="how-it-works-heading" className="text-h1 font-bold text-text-primary mb-3">
              Up and running in minutes
            </h2>
            <p className="text-text-secondary max-w-lg mx-auto">
              No lengthy onboarding. No IT team needed. Just sign up and start recording donations.
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8" role="list">
            {steps.map(({ num, title, desc }, idx) => (
              <li key={num} className="relative flex flex-col items-center text-center md:items-start md:text-left">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-6 left-[calc(50%+2rem)] right-0 h-px bg-border-default"
                    aria-hidden="true"
                  />
                )}
                <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold text-sm mb-4 flex-shrink-0 shadow-glow">
                  {num}
                </div>
                <h3 className="text-h3 font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────── */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="pricing-heading"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 id="pricing-heading" className="text-h1 font-bold text-text-primary mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-text-secondary">No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(({ name, price, desc, features: planFeatures, popular }) => (
              <article
                key={name}
                className={[
                  'relative bg-bg-surface border rounded-xl p-6 flex flex-col',
                  popular
                    ? 'border-brand-primary ring-2 ring-brand-primary/20 shadow-card'
                    : 'border-border-subtle',
                ].join(' ')}
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-brand-primary text-white text-xs font-bold rounded-full shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-h3 font-bold text-text-primary mb-1">{name}</h3>
                <p className="text-text-muted text-xs mb-4">{desc}</p>
                <p className="text-3xl font-bold text-text-primary mb-1">{price}</p>
                <p className="text-xs text-text-muted mb-5">per month + GST</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {planFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                      <CheckCircle size={15} className="text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={[
                    'block text-center py-2.5 rounded-full text-sm font-bold transition-all duration-150 cursor-pointer',
                    popular
                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-[0.98]'
                      : 'border border-border-default text-text-primary hover:border-brand-primary/50 hover:text-brand-primary',
                  ].join(' ')}
                >
                  Get started
                </Link>
              </article>
            ))}
          </div>

          <p className="text-center mt-6 text-sm text-text-muted">
            Need more details?{' '}
            <Link to="/pricing" className="text-brand-primary font-medium hover:underline cursor-pointer">
              View full pricing →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--gold-accent)) 100%)',
        }}
        aria-labelledby="cta-heading"
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-4 inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full">
            <Flame size={28} className="text-white" aria-hidden="true" />
          </div>
          <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to modernize your temple?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
            Join temples across India that have replaced paper ledgers with DevaSeva.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-primary font-bold text-lg rounded-full hover:bg-white/90 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-lg"
          >
            Get Started Free
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
          <p className="mt-4 text-white/60 text-sm">No credit card required</p>
        </div>
      </section>
    </WebsiteLayout>
  );
}
