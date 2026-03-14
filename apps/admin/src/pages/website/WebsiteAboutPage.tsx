import { Link } from 'react-router-dom';
import { Flame, Heart, Shield, ArrowRight } from 'lucide-react';
import { WebsiteLayout } from './components/WebsiteLayout';
import { WebsiteSEO } from './components/WebsiteSEO';

const values = [
  {
    icon: Flame,
    title: 'Simplicity First',
    desc: 'Counter staff at a small mandir in a Tier-3 city should find DevaSeva as easy to use as sending a WhatsApp message. No training courses, no IT department needed.',
  },
  {
    icon: Shield,
    title: 'Trust & Integrity',
    desc: 'Temples handle public money and legally required tax documents. Every rupee is tracked with an audit trail. PAN numbers are encrypted. Financial data is never soft-deleted.',
  },
  {
    icon: Heart,
    title: 'India-First Design',
    desc: 'We support all Indian payment modes — cash, UPI, cheque, DD. Names appear in Devanagari. Fiscal years follow April–March. Receipts comply with 80G and FCRA regulations.',
  },
];

export function WebsiteAboutPage() {
  return (
    <WebsiteLayout>
      <WebsiteSEO
        title="About Us"
        description="DevaSeva was built by Infosware Pvt. Ltd. to bring modern software to India's temples — without the complexity. Learn our story and mission."
        canonical="https://devaseva.in/about"
      />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        className="relative py-24 px-4 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(150deg, hsl(var(--brand-primary)) 0%, hsl(var(--gold-accent)) 100%)',
        }}
        aria-labelledby="about-heading"
      >
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full">
            <Flame size={30} className="text-white" aria-hidden="true" />
          </div>
          <h1 id="about-heading" className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Built for Bharat's Temples
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
            Modern software for India's oldest institutions — without the complexity that usually comes with it.
          </p>
        </div>
      </section>

      {/* ── Story ────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="story-heading"
      >
        <div className="max-w-3xl mx-auto">
          <h2 id="story-heading" className="text-h1 font-bold text-text-primary mb-8" style={{ fontSize: '2rem' }}>
            Our Story
          </h2>

          <div className="prose prose-lg max-w-none space-y-6 text-text-secondary leading-relaxed">
            <p>
              DevaSeva was built by{' '}
              <strong className="text-text-primary">Infosware Pvt. Ltd.</strong>{' '}
              to bring modern software to India's temples — without the complexity that has historically kept smaller mandirs from adopting technology.
            </p>
            <p>
              Temple management in India has long relied on paper donation registers, handwritten receipts, and WhatsApp groups for communication. When donation volumes grow or a new fiscal year begins, reconciling those paper trails becomes a nightmare — especially when compliance officers ask for 80G-eligible donor lists or the income tax department requests documentation.
            </p>
            <p>
              We built DevaSeva to solve exactly this. Our goal was simple: a counter staff member records a ₹5,100 cash donation, and the devotee receives an 80G-compliant PDF receipt on WhatsApp in under 30 seconds. No manual steps. No waiting. No errors. That single workflow drives every design decision we make.
            </p>
            <p>
              Today, DevaSeva handles donations, seva bookings, devotee records, finance ledgers, and WhatsApp notifications — all in one platform that works equally well on a desktop at a large temple complex or on a basic Android phone at a neighbourhood mandir.
            </p>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────── */}
      <section
        className="py-16 px-4 sm:px-6 lg:px-8 bg-bg-surface-2"
        aria-labelledby="values-heading"
      >
        <div className="max-w-5xl mx-auto">
          <h2 id="values-heading" className="text-h1 font-bold text-text-primary text-center mb-12" style={{ fontSize: '2rem' }}>
            What We Stand For
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <article
                key={title}
                className="bg-bg-surface border border-border-subtle rounded-xl p-6 hover:border-brand-primary/30 transition-all duration-200"
              >
                <div className="w-11 h-11 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={22} className="text-brand-primary" aria-hidden="true" />
                </div>
                <h3 className="text-h3 font-bold text-text-primary mb-3">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Company ──────────────────────────────────────────────────── */}
      <section
        className="py-16 px-4 sm:px-6 lg:px-8"
        aria-labelledby="company-heading"
      >
        <div className="max-w-3xl mx-auto">
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-8">
            <h2 id="company-heading" className="text-h2 font-bold text-text-primary mb-4">
              The Company
            </h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              <strong className="text-text-primary">Infosware Pvt. Ltd.</strong> is a software company based in Noida, Uttar Pradesh, India. We build technology products for sectors where good software is scarce — and where the impact of that software is deeply meaningful.
            </p>
            <p className="text-text-secondary leading-relaxed mb-6">
              DevaSeva is our flagship product for the temple management sector. We are committed to long-term development, compliance with Indian tax regulations, and continuous improvement based on real temple operations.
            </p>
            <div className="flex items-center gap-3 text-sm text-text-muted pt-4 border-t border-border-subtle">
              <Flame size={16} className="text-brand-primary" aria-hidden="true" />
              <span>Infosware Pvt. Ltd., Noida, Uttar Pradesh, India</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission CTA ──────────────────────────────────────────────── */}
      <section
        className="py-16 px-4 text-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--gold-accent)) 100%)',
        }}
        aria-labelledby="mission-cta"
      >
        <div className="max-w-2xl mx-auto">
          <h2 id="mission-cta" className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Our mission: zero paper in temple operations by 2027.
          </h2>
          <p className="text-white/80 mb-8 leading-relaxed">
            Join us in modernizing India's sacred institutions — one temple at a time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/15 border border-white/30 text-white font-semibold rounded-full hover:bg-white/25 transition-all cursor-pointer"
            >
              Get in Touch
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-brand-primary font-bold rounded-full hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
            >
              Start Free Trial
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
}
