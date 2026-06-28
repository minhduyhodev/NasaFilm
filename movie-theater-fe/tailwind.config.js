/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "sans-serif"],
        heading: ["Montserrat", "sans-serif"],
        ui: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}