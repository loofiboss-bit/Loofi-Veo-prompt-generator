/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'flash-border': 'flash-border 0.8s ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'text-fade-in': 'text-fade-in 0.5s ease-out',
        'icon-spin': 'icon-spin-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'tutorial-glow': 'tutorial-glow 1.8s ease-in-out infinite',
      },
      keyframes: {
        'flash-border': {
          '0%': {
            borderColor: '#1e293b',
            boxShadow: '0 0 0 0 rgba(34, 211, 238, 0)',
          },
          '50%': {
            borderColor: '#22d3ee',
            boxShadow: '0 0 15px 2px rgba(34, 211, 238, 0.3)',
          },
          '100%': {
            borderColor: '#1e293b',
            boxShadow: '0 0 0 0 rgba(34, 211, 238, 0)',
          },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(1.5rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'text-fade-in': {
          from: { opacity: '0', transform: 'translateY(0.5rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'icon-spin-in': {
          from: { transform: 'rotate(-180deg) scale(0.5)', opacity: '0' },
          to: { transform: 'rotate(0) scale(1)', opacity: '1' },
        },
        'tutorial-glow': {
          '0%, 100%': {
            outline: '2px solid hsla(192, 82%, 60%, 0.5)',
            boxShadow: '0 0 15px hsla(192, 82%, 60%, 0.3)',
          },
          '50%': {
            outline: '3px solid hsla(192, 82%, 60%, 0.9)',
            boxShadow: '0 0 25px hsla(192, 82%, 60%, 0.6)',
          },
        },
      },
    },
  },
  plugins: [],
};
