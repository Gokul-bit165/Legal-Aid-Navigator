/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FEFCF8',
          100: '#F9F5ED',
          200: '#F5F0E8',
          300: '#EDE8DC',
          400: '#E0D9C8',
        },
        khaki: {
          100: '#DDD6C4',
          200: '#C8BFA8',
          300: '#B0A48C',
          400: '#8C7E66',
        },
        olive: {
          50: '#F2F2E8',
          100: '#D6D6B0',
          200: '#AAAA6E',
          300: '#7A7A3C',
          400: '#5A5A2A',
          500: '#4A4A2A',
          600: '#3A3A1E',
          700: '#2A2A14',
          800: '#1E1E0E',
        },
        bark: {
          100: '#E8E0D0',
          200: '#C8B89A',
          300: '#A89070',
          400: '#8A7055',
          500: '#6B6355',
          600: '#4E4840',
        },
        crimson: {
          100: '#FAE8E8',
          400: '#C86060',
          500: '#B94040',
          600: '#963232',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(74,74,42,0.08)',
        'card-hover': '0 4px 20px 0 rgba(74,74,42,0.14)',
        input: '0 1px 3px 0 rgba(74,74,42,0.06)',
      },
    },
  },
  plugins: [],
};
