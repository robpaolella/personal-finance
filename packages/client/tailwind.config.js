export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        sidebar: '#0f172a',
        surface: '#f4f6f9',
        card: '#ffffff',
        border: '#e8ecf1',
        'text-primary': '#0f172a',
        'text-body': '#475569',
        'text-secondary': '#64748b',
        'text-muted': '#94a3b8',
        positive: '#10b981',
        negative: '#ef4444',
        accent: '#3b82f6',
      },
    },
  },
  plugins: [],
};
