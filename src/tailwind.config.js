/** @type {import('tailwindcss').Config} */
import tailwindcss from '@tailwindcss/vite'
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#667eea',
          600: '#5a6fd8',
          700: '#4d5ec6',
        },
        secondary: {
          500: '#764ba2',
        }
      }
    },
  },
  plugins: [],
}