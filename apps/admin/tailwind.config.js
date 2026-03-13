/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens — consumed from CSS custom properties in index.css ──
        // Light and dark values are set via :root / .dark in index.css.
        // Tailwind classes (bg-bg-page, text-text-primary, etc.) resolve through
        // these hsl(var(--token)) references — never hardcode hex/rgb here.

        // Backgrounds
        'bg-page':     'hsl(var(--bg-page))',
        'bg-surface':  'hsl(var(--bg-surface))',
        'bg-surface-2':'hsl(var(--bg-surface-2))',
        'bg-surface-3':'hsl(var(--bg-surface-3))',

        // Borders
        'border-subtle':  'hsl(var(--border-subtle))',
        'border-default': 'hsl(var(--border-default))',
        'border-strong':  'hsl(var(--border-strong))',

        // Text
        'text-primary':   'hsl(var(--text-primary))',
        'text-secondary': 'hsl(var(--text-secondary))',
        'text-muted':     'hsl(var(--text-muted))',
        'text-inverse':   'hsl(var(--text-inverse))',

        // Brand (saffron-based per CLAUDE.md)
        'brand-primary':       'hsl(var(--brand-primary))',
        'brand-primary-hover': 'hsl(var(--brand-primary-hover))',
        'brand-primary-subtle':'hsl(var(--brand-primary-subtle))',
        'brand-primary-fg':    'hsl(var(--brand-primary-fg))',

        // Semantic states
        success: {
          DEFAULT: 'hsl(var(--success))',
          subtle:  'hsl(var(--success-subtle))',
          fg:      'hsl(var(--success-fg))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          subtle:  'hsl(var(--warning-subtle))',
          fg:      'hsl(var(--warning-fg))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          subtle:  'hsl(var(--danger-subtle))',
          fg:      'hsl(var(--danger-fg))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          subtle:  'hsl(var(--info-subtle))',
          fg:      'hsl(var(--info-fg))',
        },

        // ── Static palette tokens (no dark-mode variant) ──────────────────────
        // Use only when you need a fixed colour regardless of theme.
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
        card:  '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-dark': '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        glow:  '0 0 0 3px hsl(var(--brand-primary) / 0.35)',
        modal: '0 20px 60px -10px rgba(0,0,0,0.3)',
      },

      transitionProperty: {
        colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
      },

      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        shake:      'shake 0.4s ease-in-out',
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
