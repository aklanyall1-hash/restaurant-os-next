/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#FF6B35',
        dark: '#0A0A0F',
        surface: '#13131A',
        card: '#1C1C28',
        border: '#2A2A3A',
      },
      fontFamily: {
        arabic: ['Cairo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
