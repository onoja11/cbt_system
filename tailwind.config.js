/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soft, kid-friendly primary tones
        classroom: {
          blue: '#4f46e5',
          green: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      }
    },
  },
  plugins: [],
}