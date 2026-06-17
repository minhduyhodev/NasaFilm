/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Bắt buộc phải có dấu nháy đơn "'" cuộn quanh tên font có khoảng trắng
        sans: ["'Be Vietnam Pro'", "sans-serif"], 
      },
    },
  },
  plugins: [],
}