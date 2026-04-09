/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#06060C',
        surface: '#0E0E18',
        'surface-2': '#161625',
        orange: {
          DEFAULT: '#E8862A',
          light: '#F5A54B',
          dim: 'rgba(232, 134, 42, 0.2)',
        },
        text: {
          DEFAULT: '#F0EDE8',
          muted: '#7A7A8C',
        },
        border: '#1E1E30',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
