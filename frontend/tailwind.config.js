/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        accent: 'var(--accent)',
        'accent-figure': 'var(--accent-figure)',
        dim: {
          cognitive:  '#5B9BD5',
          moral:      '#C2657A',
          cultural:   '#9B72CF',
          embodied:   '#D4824A',
          relational: '#7B88CC',
          competency: '#4BA888',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sharp: '2px',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ring-pulse': {
          '0%':   { boxShadow: '0 0 0 0 var(--accent-glow)' },
          '70%':  { boxShadow: '0 0 0 10px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.6s ease forwards',
        'ring-pulse': 'ring-pulse 1s ease 3',
      },
      boxShadow: {
        card:     '0 2px 12px rgba(0,0,0,0.06)',
        'card-lg': '0 4px 24px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
