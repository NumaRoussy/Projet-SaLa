/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        scout: {
          forest:  '#1a3a2a',
          green:   '#2d6a4f',
          mid:     '#40916c',
          sage:    '#74c69d',
          amber:   '#e9c46a',
          orange:  '#f4a261',
          rust:    '#e76f51',
          bark:    '#6d4c41',
          night:   '#0d1117',
          dark:    '#111827',
          card:    '#1f2937',
          glass:   'rgba(31,41,55,0.7)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':  'fadeIn 0.3s ease',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'countdown': 'countdownShrink linear forwards',
        'glow':     'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        countdownShrink: {
          '0%':   { width: '100%' },
          '100%': { width: '0%' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(116,198,157,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(116,198,157,0.7), 0 0 40px rgba(116,198,157,0.3)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
