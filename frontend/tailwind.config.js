/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: 'var(--card-bg)',              /* Pure white cards */
          900: 'var(--card-bg-hover)',        /* Gentle blue-tinted hover state and select/inputs */
          850: 'var(--border-color)',         /* Sky-blue borders */
          800: 'var(--border-color)',         /* Sky-blue layout borders */
          750: 'var(--border-color-dark)',    /* Sky-blue layout borders active */
          700: 'var(--border-color-dark)',    /* Sky-blue layout borders active */
          600: 'var(--text-secondary)',       /* Slate-blue descriptive text */
          500: 'var(--text-secondary)',       /* Slate-blue descriptive text */
          400: 'var(--text-secondary-light)', /* Lighter slate-blue labels */
          300: 'var(--text-secondary-light)', /* Lighter slate-blue labels */
          200: 'var(--text-primary-light)',   /* Secondary navy text headings */
          100: 'var(--text-primary)',         /* Primary royal navy headings */
        },
        teal: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7dbdfc',
          400: 'var(--accent-secondary)',    /* Accent hover */
          500: 'var(--accent-primary)',      /* Soft slate-blue from the image (replaces teal-500) */
          600: 'var(--accent-dark)',         /* Dark active slate-blue */
          700: 'var(--accent-dark)',         /* Dark active slate-blue */
          800: 'var(--text-primary)',        /* Primary headings */
          900: 'var(--text-primary)',        /* Primary headings */
        },
        sky: {
          500: 'var(--accent-sky)',          /* Deep royal navy blue accent */
        }
      },
      fontFamily: {
        sans: ["'Fabric Grotesk'", 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
