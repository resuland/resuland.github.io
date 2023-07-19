/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      'fira': ['"Fira Code"'],
      'nunito': ['"Nunito"'],
      'opensans': ['"Open Sans"'],
      'dmsans': ['"DM Sans"'],
      'dmmono': ['"DM Mono"'],
    },
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
}
