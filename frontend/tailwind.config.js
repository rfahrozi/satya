module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3b82f6',
          2: '#6366f1',
        },
        ui: {
          900: '#071028',
          800: '#0f1724',
        },
        success: '#10b981',
        warn: '#f59e0b',
        danger: '#ef4444',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '20px',
        pill: '9999px',
      },
      boxShadow: {
        'xl-soft': '0 10px 30px rgba(2,6,23,0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
