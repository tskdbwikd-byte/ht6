/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page-plane)',
        surface: 'var(--surface-1)',
        surface2: 'var(--surface-2)',
        ink: {
          DEFAULT: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
        },
        hairline: 'var(--border-hairline)',
        grid: 'var(--gridline)',
        brand: {
          DEFAULT: '#4A9B8C',
          hover: '#3D8A7C',
          soft: 'var(--brand-soft)',
          mist: '#E8F4F1',
          sky: '#B8DCE8',
        },
        dns: { DEFAULT: 'var(--series-dns)' },
        tls: { DEFAULT: 'var(--series-tls)' },
        blocked: { DEFAULT: 'var(--series-blocked)' },
        good: '#0ca30c',
        warning: '#fab219',
        serious: '#ec835a',
        critical: '#d03b3b',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Nunito Sans', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,11,11,0.04), 0 8px 24px -12px rgba(11,11,11,0.12)',
        soft: '0 12px 40px -16px rgba(74, 155, 140, 0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s ease-out both',
      },
    },
  },
  plugins: [],
}
