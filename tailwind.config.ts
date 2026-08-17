/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        marvel: {
          red: '#C41E3A',
          gold: '#FFD700',
          dark: '#0A0A0A',
        },
        hero: {
          covert: '#7C3AED',
          instinct: '#D97706',
          ranged: '#2563EB',
          strength: '#DC2626',
          tech: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      screens: {
        xs: '360px',
      },
    },
  },
  plugins: [],
};

