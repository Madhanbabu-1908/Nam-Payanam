export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Sora"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        tamil:   ['"Noto Sans Tamil"', 'sans-serif'],
      },
      colors: {
        brand:  { DEFAULT:'#FF6B35', dark:'#E55A25', light:'#FFF0EB' },
        jade:   { DEFAULT:'#10B981', light:'#D1FAE5' },
        sky:    { DEFAULT:'#0EA5E9', light:'#E0F2FE' },
        rose:   { DEFAULT:'#F43F5E', light:'#FFE4E6' },
        amber:  { DEFAULT:'#F59E0B', light:'#FEF3C7' },
      },
      boxShadow: {
        'brand': '0 4px 14px rgba(255,107,53,0.35)',
        'card':  '0 1px 8px rgba(0,0,0,0.06)',
        'float': '0 8px 32px rgba(0,0,0,0.10)',
      },
      keyframes: {
        shimmer: { '0%':{'background-position':'-200% 0'}, '100%':{'background-position':'200% 0'} },
      },
      animation: {
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
