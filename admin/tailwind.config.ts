import type { Config } from 'tailwindcss';

// Palette sobre, issue du logo FOM : bleu profond + un seul accent bleu. Les noms de jetons sont conservés
// (navy = encre/bleu nuit, ocean et lagoon = bleu d'accent, coral = erreurs) pour ne pas toucher au reste du code.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f2f5fa', 100: '#e1e7f1', 200: '#c3cfe3', 300: '#9aaccb', 400: '#6c82aa', 600: '#233f73', 700: '#1a3160', 800: '#122650', 900: '#0b1b3a', 950: '#070f22' },
        lagoon: { 50: '#eef5fd', 100: '#dbe9fb', 200: '#b9d3f6', 300: '#8bb6ee', 400: '#4f8fe3', 500: '#1f6fd6', 600: '#0f5bbd', 700: '#0b4a9c' },
        ocean: { 50: '#eef5fd', 100: '#dbe9fb', 400: '#4f8fe3', 500: '#1f6fd6', 600: '#0f5bbd' },
        sand: { 50: '#fbf8f3', 100: '#f5efe4', 200: '#ebe1cd' },
        coral: { 400: '#ef8a80', 500: '#dc3d30', 600: '#bf2f25' },
        line: '#e2e8f1',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11, 27, 58, 0.04), 0 8px 24px -16px rgba(11, 27, 58, 0.16)',
        lift: '0 1px 3px rgba(11, 27, 58, 0.06), 0 14px 32px -18px rgba(11, 27, 58, 0.22)',
        glow: '0 1px 2px rgba(11, 27, 58, 0.10)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { 'fade-up': 'fade-up .4s cubic-bezier(.2,.7,.2,1) both' },
    },
  },
  plugins: [],
};

export default config;
