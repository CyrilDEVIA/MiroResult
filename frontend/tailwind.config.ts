/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1e40af',
          light: '#3b82f6',
          dark: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
