/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg:        '#0f1f3a',
        darkPanel:     '#0a1628',
        darkCard:      '#061428',
        brandCyan:     '#60a5fa',
        brandCyanDim:  '#1d4ed8',
        brandGreen:    '#22c55e',
        brandWarning:  '#facc15',
        brandCritical: '#ef4444',
        brandBlue:     '#2563eb',
        brandOrange:   '#f97316',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
