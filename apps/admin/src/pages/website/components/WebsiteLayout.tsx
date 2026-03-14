import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Flame } from 'lucide-react';

const navLinks = [
  { to: '/features', label: 'Features' },
  { to: '/pricing',  label: 'Pricing' },
  { to: '/about',    label: 'About' },
  { to: '/contact',  label: 'Contact' },
];

const footerProduct = [
  { to: '/features', label: 'Features' },
  { to: '/pricing',  label: 'Pricing' },
  { to: '/portal',   label: 'Public Portal' },
];

const footerCompany = [
  { to: '/about',   label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

const footerLegal = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms',   label: 'Terms of Service' },
];

interface WebsiteLayoutProps {
  children: React.ReactNode;
}

/**
 * WebsiteLayout — shared shell for all public marketing pages.
 * Sticky navbar + semantic footer. No auth required.
 */
export function WebsiteLayout({ children }: WebsiteLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors duration-150 cursor-pointer ${
      isActive
        ? 'text-brand-primary'
        : 'text-text-secondary hover:text-text-primary'
    }`;

  return (
    <div className="min-h-screen bg-bg-page text-text-primary flex flex-col">

      {/* ── Sticky navbar ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-bg-surface/90 backdrop-blur-md border-b border-border-subtle">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 flex-shrink-0 focus-ring rounded-md"
            aria-label="DevaSeva home"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center flex-shrink-0">
              <Flame size={16} className="text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg text-text-primary tracking-tight">DevaSeva</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-7" role="list">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} className={navLinkClass} role="listitem">
                {label}
              </NavLink>
            ))}
          </div>

          {/* Desktop Sign In */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-brand-primary border border-brand-primary rounded-full hover:bg-brand-primary/8 transition-all duration-150 cursor-pointer focus-ring"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold bg-brand-primary text-white rounded-full hover:bg-brand-primary-hover active:scale-[0.98] transition-all duration-150 cursor-pointer focus-ring"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-surface-2 transition-colors cursor-pointer focus-ring"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            id="mobile-menu"
            className="md:hidden bg-bg-surface border-t border-border-subtle px-4 pb-4 pt-2 flex flex-col gap-1 animate-fade-in"
          >
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'
                  }`
                }
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            <div className="border-t border-border-subtle mt-2 pt-3 flex flex-col gap-2">
              <Link
                to="/login"
                className="block text-center py-2.5 text-sm font-semibold text-brand-primary border border-brand-primary rounded-full hover:bg-brand-primary/8 transition-all cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="block text-center py-2.5 text-sm font-semibold bg-brand-primary text-white rounded-full hover:bg-brand-primary-hover transition-all cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-bg-surface border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

            {/* Brand column */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-3 focus-ring rounded-md w-fit">
                <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center">
                  <Flame size={14} className="text-white" aria-hidden="true" />
                </div>
                <span className="font-bold text-base text-text-primary">DevaSeva</span>
              </Link>
              <p className="text-sm text-text-muted leading-relaxed max-w-xs">
                Modern temple management for Indian temples. Donations, sevas, and WhatsApp receipts — unified.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Product</h3>
              <ul className="space-y-2">
                {footerProduct.map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Company</h3>
              <ul className="space-y-2">
                {footerCompany.map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Legal</h3>
              <ul className="space-y-2">
                {footerLegal.map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-border-subtle mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              &copy; {new Date().getFullYear()} Infosware Solutions Pvt. Ltd. All rights reserved.
            </p>
            <p className="text-xs text-text-muted">
              Built with{' '}
              <span className="text-brand-primary font-medium">DevaSeva</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
