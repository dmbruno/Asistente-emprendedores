import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      colors: {
        admin: {
          bg: '#09090e',
          surface: '#111118',
          sidebar: '#0c0c12',
          border: 'rgba(255,255,255,0.06)',
          accent: '#f59e0b',
          'accent-dim': 'rgba(245,158,11,0.12)',
          text: '#f1f0ec',
          muted: '#6b7280',
          dim: '#3f3f46',
          success: '#10b981',
          danger: '#ef4444',
          info: '#6366f1',
        },
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, rgba(245,158,11,0.15) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '28px 28px',
      },
    },
  },
  plugins: [],
};

export default config;
