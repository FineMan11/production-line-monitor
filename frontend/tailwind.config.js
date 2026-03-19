/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind which files to scan for class names.
  // Without this, Tailwind won't know which classes to include and your styles won't work.
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0D9488', // teal-600
          dark:    '#0F766E', // teal-700
          light:   '#F0FDFA', // teal-50
        },
      },
    },
  },
  plugins: [],
}
