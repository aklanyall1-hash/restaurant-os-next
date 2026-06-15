/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#FF6B35',
        'brand-light': '#FF8C5A',
        dark: '#0B0A09',
        surface: '#16140F',
        card: '#1F1C16',
        border: '#332C22',
        gold: '#C9A14A',
      },
      fontFamily: {
        arabic: ['Cairo', 'sans-serif'],
        display: ['El Messiri', 'Cairo', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,107,53,0.45)' },
          '50%': { boxShadow: '0 0 0 10px rgba(255,107,53,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        'scale-in': 'scale-in 0.35s ease-out both',
        'glow-pulse': 'glow-pulse 2s infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}
