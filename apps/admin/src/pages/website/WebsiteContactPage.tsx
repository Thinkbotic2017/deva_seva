import { useState } from 'react';
import { Mail, MapPin, Clock, CheckCircle, Send } from 'lucide-react';
import { WebsiteLayout } from './components/WebsiteLayout';
import { WebsiteSEO } from './components/WebsiteSEO';

interface FormState {
  name: string;
  email: string;
  phone: string;
  templeName: string;
  message: string;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-border-default bg-bg-surface-2 text-text-primary ' +
  'placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ' +
  'focus:border-brand-primary transition-all';

const labelClass = 'block text-sm font-medium text-text-secondary mb-1.5';

export function WebsiteContactPage() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    templeName: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    // Simulate async submission — no backend needed yet
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 800);
  }

  return (
    <WebsiteLayout>
      <WebsiteSEO
        title="Contact Us"
        description="Get in touch with the DevaSeva team. We respond within 24 hours. Email us at hello@devaseva.in or fill out the contact form."
        canonical="https://devaseva.in/contact"
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 text-center"
        style={{
          background: 'linear-gradient(160deg, hsl(var(--brand-primary) / 0.06) 0%, hsl(var(--gold-accent) / 0.06) 100%)',
        }}
        aria-labelledby="contact-heading"
      >
        <div className="max-w-2xl mx-auto">
          <h1 id="contact-heading" className="text-h1 font-bold text-text-primary mb-3" style={{ fontSize: '2.25rem', lineHeight: '1.2' }}>
            Get in Touch
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed">
            Have a question about DevaSeva? Want to see a demo? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Left: contact info */}
          <aside className="lg:col-span-2" aria-label="Contact information">
            <div className="space-y-6">
              <h2 className="text-h2 font-bold text-text-primary mb-6">Contact Info</h2>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail size={18} className="text-brand-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary mb-0.5">Email</p>
                  <a
                    href="mailto:hello@devaseva.in"
                    className="text-sm text-brand-primary hover:underline cursor-pointer"
                  >
                    hello@devaseva.in
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-brand-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary mb-0.5">Location</p>
                  <p className="text-sm text-text-secondary">
                    Infosware Solutions Pvt. Ltd.<br />
                    Noida, Uttar Pradesh, India
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-brand-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary mb-0.5">Response Time</p>
                  <p className="text-sm text-text-secondary">
                    We respond within 24 hours.<br />
                    Mon–Sat, 10am–6pm IST.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ callout */}
            <div className="mt-10 bg-brand-primary/8 border border-brand-primary/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-text-primary mb-2">Common Questions</p>
              <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                Before reaching out, check our pricing FAQ — most questions about plans, features, and compliance are answered there.
              </p>
              <a
                href="/pricing#faq"
                className="text-sm font-semibold text-brand-primary hover:underline cursor-pointer"
              >
                View FAQ →
              </a>
            </div>
          </aside>

          {/* Right: contact form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="bg-bg-surface border border-border-subtle rounded-2xl p-8 flex flex-col items-center text-center animate-fade-in">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-5">
                  <CheckCircle size={32} className="text-success" aria-hidden="true" />
                </div>
                <h2 className="text-h2 font-bold text-text-primary mb-3">Message Sent!</h2>
                <p className="text-text-secondary text-sm max-w-sm leading-relaxed mb-6">
                  Thanks for reaching out. Our team will reply to <strong className="text-text-primary">{form.email}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', templeName: '', message: '' }); }}
                  className="px-6 py-2.5 text-sm font-semibold border border-border-default rounded-full hover:border-brand-primary/50 hover:text-brand-primary transition-all cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="bg-bg-surface border border-border-subtle rounded-2xl p-8">
                <h2 className="text-h2 font-bold text-text-primary mb-6">Send Us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="contact-name" className={labelClass}>Your Name</label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        placeholder="Full name"
                        value={form.name}
                        onChange={handleChange}
                        maxLength={200}
                        className={inputClass}
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className={labelClass}>Email Address</label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={handleChange}
                        maxLength={200}
                        className={inputClass}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="contact-phone" className={labelClass}>Phone Number</label>
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        placeholder="10-digit mobile"
                        value={form.phone}
                        onChange={handleChange}
                        maxLength={10}
                        className={inputClass}
                        autoComplete="tel"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-temple" className={labelClass}>Temple Name</label>
                      <input
                        id="contact-temple"
                        name="templeName"
                        type="text"
                        placeholder="Your temple name"
                        value={form.templeName}
                        onChange={handleChange}
                        maxLength={200}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className={labelClass}>Message</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={5}
                      placeholder="Tell us about your temple and what you're looking for..."
                      value={form.message}
                      onChange={handleChange}
                      maxLength={2000}
                      className={`${inputClass} resize-none`}
                    />
                    <p className="text-xs text-text-muted mt-1 text-right">{form.message.length}/2000</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !form.name.trim() || !form.email.trim() || !form.message.trim()}
                    className="w-full py-3.5 bg-brand-primary text-white font-bold rounded-full text-sm hover:bg-brand-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={16} aria-hidden="true" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
}
