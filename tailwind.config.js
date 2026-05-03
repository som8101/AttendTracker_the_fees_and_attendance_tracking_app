/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        marble: {
          900: '#2D3E40', // Darkest
          800: '#32484a', // Dark
          700: '#387373', // Primary
          500: '#97A6A0', // Muted Gray-Green
          400: '#93BFB7', // Light Teal
          300: '#b0cfc8', // Lighter Teal
          200: '#cce0db', // Very Light Teal
          100: '#e0ede9', // Barely Teal
          50: '#E4F2E7',  // Very Light Mint Background
        }
      }
    },
  },
  plugins: [],
}
