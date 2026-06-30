import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        alpha: {
          900: '#04040e',
          800: '#080816',
          700: '#0d0d22',
          600: '#12122e',
          blue: '#0055ff',
          'blue-b': '#0077ff',
          neon: '#00aaff',
          glow: 'rgba(0,85,255,0.28)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 3.5s ease-in-out infinite',
        'float-delay': 'float 3.5s ease-in-out 1.75s infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
