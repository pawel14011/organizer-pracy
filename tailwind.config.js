/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        priority: {
          low: {
            DEFAULT: '#3b82f6',
            light: '#eff6ff',
            border: '#bfdbfe',
            text: '#1d4ed8',
          },
          medium: {
            DEFAULT: '#f59e0b',
            light: '#fffbeb',
            border: '#fde68a',
            text: '#b45309',
          },
          high: {
            DEFAULT: '#ef4444',
            light: '#fef2f2',
            border: '#fecaca',
            text: '#b91c1c',
          },
        },
        status: {
          todo: {
            DEFAULT: '#64748b',
            light: '#f8fafc',
            border: '#e2e8f0',
            text: '#334155',
          },
          done: {
            DEFAULT: '#10b981',
            light: '#ecfdf5',
            border: '#a7f3d0',
            text: '#047857',
          },
          overdue: {
            DEFAULT: '#dc2626',
            light: '#fee2e2',
            border: '#fca5a5',
            text: '#991b1b',
          },
        },
      },
    },
  },
  plugins: [],
};
