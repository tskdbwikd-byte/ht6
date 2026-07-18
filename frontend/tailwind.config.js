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
          DEFAULT: '#F6821F',
          hover: '#e0740f',
          soft: 'var(--brand-soft)',
        },
        dns: { DEFAULT: 'var(--series-dns)' },
        tls: { DEFAULT: 'var(--series-tls)' },
        good: '#0ca30c',
        warning: '#fab219',
        serious: '#ec835a',
        critical: '#d03b3b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,11,11,0.04), 0 8px 24px -12px rgba(11,11,11,0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
