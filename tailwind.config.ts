import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'gray': {
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
          400: '#9CA3AF',
        },
        'blue': {
          600: '#2563EB',
          700: '#1D4ED8',
          400: '#60A5FA',
        },
        'green': {
          400: '#4ADE80',
          600: '#16A34A',
        },
        'red': {
          600: '#DC2626',
          700: '#B91C1C',
        },
        'yellow': {
          400: '#FACC15',
        }
      },
      spacing: {
        '96': '24rem',
        '128': '32rem',
      },
      borderRadius: {
        'lg': '0.5rem',
      },
      boxShadow: {
        'game': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;