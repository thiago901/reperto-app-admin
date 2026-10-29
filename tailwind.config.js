/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mesma marca do Repertô.
        primary: {
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
        },
        // Superfícies do painel (um degrau mais frio que o zinc do app).
        ink: {
          950: '#0b0b0d',
          900: '#111114',
          850: '#16161a',
          800: '#1c1c21',
          700: '#2a2a31',
          600: '#3a3a43',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
