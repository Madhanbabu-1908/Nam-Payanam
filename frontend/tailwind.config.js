/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'sans-serif'],
      },
      colors: {
        indigo: {
          50:  '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe',
          300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1',
          600: '#4f46e5', 700: '#4338ca', 800: '#3730a3',
          900: '#312e81', 950: '#1e1b4b',
        },
        saffron: {
          50:  '#fff8ed', 100: '#ffefd3', 200: '#ffdba5',
          300: '#ffc06d', 400: '#ff9a32', 500: '#ff7c0a',
          600: '#f06000', 700: '#c74800', 800: '#9e3a00', 900: '#7f3100',
        },
        gold: {
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706',
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #ff7c0a 100%)',
        'card-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'saffron-gradient': 'linear-gradient(135deg, #ff7c0a 0%, #f06000 100%)',
        'dark-card': 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(99,102,241,0.12)',
        'saffron': '0 4px 20px rgba(255,124,10,0.30)',
        'indigo': '0 4px 20px rgba(79,70,229,0.30)',
        'glass': '0 8px 32px rgba(31,38,135,0.15)',
      },
      animation: {
        'fade-in':    'fadeIn 0.35s ease-out',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in':   'scaleIn 0.2s ease-out',
        'shimmer':    'shimmer 1.8s infinite',
        'pulse-dot':  'pulseDot 1.5s ease-in-out infinite',
        'bounce-in':  'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseDot:  { '0%,100%': { transform: 'scale(1)', opacity: 1 }, '50%': { transform: 'scale(1.4)', opacity: 0.7 } },
        bounceIn:  { '0%': { transform: 'scale(0.8)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}
