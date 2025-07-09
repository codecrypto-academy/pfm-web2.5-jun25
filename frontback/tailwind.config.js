/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'blue-dark': '#0D1B2A',
        'blue-main': '#1B263B',
        'blue-light': '#415A77',
        'blue-lighter': '#778DA9',
        'blue-accent': '#E0E1DD',
        'green-main': '#50C878',
        'green-light': '#90EE90',
        'purple-accent': '#8A2BE2',
      },
    },
  },
  plugins: [],
};