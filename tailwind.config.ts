import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdf8ec',
          100: '#faedc4',
          200: '#f5db8c',
          300: '#eec253',
          400: '#e5a72b',
          500: '#c98a1c',
          600: '#a86a17',
          700: '#864f16',
          800: '#6f4118',
          900: '#5f3818',
        },
        ink: {
          50: '#f4f5f7',
          100: '#e4e6ea',
          200: '#c8cdd6',
          300: '#a1a9b8',
          400: '#748196',
          500: '#57647a',
          600: '#454f63',
          700: '#394152',
          800: '#252b38',
          900: '#0f1219',
          950: '#080a0e',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
      },
      boxShadow: {
        premium: '0 20px 60px -15px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
