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
          light:   '#52b788',
          sage:    '#74c69d',
          pale:    '#95d5b2',
          mist:    '#d8f3dc',
          night:   '#0d1117',
          dark:    '#161b22',
          amber:   '#e9c46a',
          orange:  '#f4a261',
          wine:    '#7b2cbf',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
