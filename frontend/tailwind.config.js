/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rm: {
          primary: '#166534',
          dark: '#14532D',
          accent: '#22C55E',
          bg: '#F5F7F2',
          surface: '#FFFFFF',
          text: '#17251C',
          muted: '#64748B',
          warning: '#D97706',
          danger: '#DC2626',
        },
      },
    },
  },
  plugins: [],
}
