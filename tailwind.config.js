/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F8F8',
        ink: '#152528',
        teal: {
          50: '#EAF4F3',
          100: '#CDE6E3',
          300: '#7CB9B4',
          500: '#0F7173',
          600: '#0C5C5D',
          700: '#0A4A4B',
          900: '#062E2F',
        },
        amber: {
          50: '#FCF3E3',
          200: '#F4D496',
          400: '#E8A33D',
          600: '#C07E1F',
        },
        coral: {
          50: '#FBEAEA',
          400: '#D65A5A',
          600: '#B23E3E',
        },
        sage: {
          50: '#E9F3EC',
          400: '#4C9A6A',
          600: '#357A4F',
        },
        line: '#DDE5E4',
      },
      fontFamily: {
        display: ['"Lexend"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(21,37,40,0.04), 0 4px 14px rgba(21,37,40,0.06)',
        stub: '0 6px 20px rgba(15,113,115,0.18)',
      },
    },
  },
  plugins: [],
}
