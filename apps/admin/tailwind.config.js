/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Admin dark theme ──────────────────────────────────────────────
        background: '#0F0F0F',  // page background
        surface:    '#1A1A1A',  // card / sidebar background
        'surface-2': '#242424', // elevated surface (hover states, nested)
        border:     '#2E2E2E',  // default border
        primary: {
          DEFAULT: '#FF6B35',   // CTA buttons — one per screen
          hover:   '#E8530A',   // hover state (saffron-500 from CLAUDE.md)
          subtle:  '#3D1A0A',   // background tint for primary areas
        },
        // ── Text ─────────────────────────────────────────────────────────
        'text-primary':   '#F5F5F5', // headings, important labels
        'text-secondary': '#A0A0A0', // supporting text
        'text-muted':     '#606060', // captions, timestamps
        // ── CLAUDE.md saffron tokens (kept for shared use) ───────────────
        saffron: {
          50:  '#FDE8D8',
          500: '#E8530A',
          700: '#B33D05',
          900: '#7A1F00',
        },
        gold: {
          50:  '#FFF5CC',
          400: '#C49A00',
        },
        // ── Semantic ─────────────────────────────────────────────────────
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        sans: ['Noto Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        xs:   '2px',
        sm:   '4px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl': '24px',
        full: '9999px',
      },
      fontSize: {
        display: ['40px', { lineHeight: '1.1', fontWeight: '700' }],
        h1:      ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        h2:      ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        h3:      ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        body:    ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        label:   ['14px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        glow: '0 0 0 3px rgba(255, 107, 53, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        shake: 'shake 0.4s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
      },
    },
  },
  plugins: [],
};
