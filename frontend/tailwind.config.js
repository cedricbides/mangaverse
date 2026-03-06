/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'cursive'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#09090f',
        surface: '#111118',
        card: 'rgba(255,255,255,0.03)',
        border: 'rgba(255,255,255,0.07)',
        primary: '#e8394d',
        'primary-dim': 'rgba(232,57,77,0.15)',
        'primary-glow': 'rgba(232,57,77,0.35)',
        accent: '#f5a623',
        'accent-dim': 'rgba(245,166,35,0.15)',
        muted: '#3a3a4a',
        text: '#f0f0fa',
        'text-muted': '#6b6b8a',
      },
      backgroundImage: {
        'radial-hero': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,57,77,0.15), transparent)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
