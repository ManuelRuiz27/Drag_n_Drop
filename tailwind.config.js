/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,jsx,js}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#eaefff',
          200: '#cdd7ff',
          300: '#aebfff',
          400: '#7f9aff',
          500: '#4b6bff',
          600: '#2847db',
          700: '#1d36a8',
          800: '#15277a',
          900: '#0e1c55'
        }
      }
    }
  },
  plugins: []
};
