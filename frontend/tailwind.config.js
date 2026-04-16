export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'sans-serif'],
      },
      colors: {
        brand: { 50:'#fff3ee', 100:'#ffe4d4', 200:'#ffcbaa', 300:'#ffa876', 400:'#ff7d40', 500:'#FF6B35', 600:'#FF4500', 700:'#cc3400', 800:'#a12900', 900:'#7a2000' },
        navy: { 50:'#eff6ff', 100:'#dbeafe', 500:'#0066CC', 600:'#0052A3', 700:'#003d7a', 800:'#002952', 900:'#001a33' },
        teal: { 50:'#f0fdfa', 500:'#14b8a6', 600:'#0d9488' },
        emerald: { 50:'#ecfdf5', 100:'#d1fae5', 500:'#10b981', 600:'#059669' },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-in': 'bounce-in 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'spin': 'spin 0.8s linear infinite',
      },
    }
  },
  plugins: []
}
