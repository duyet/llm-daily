/**
 * Tailwind CSS Configuration for LLM Daily Dashboard
 * Centralized theme configuration for consistent styling across all pages
 */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: '#FAF9F6',
        beige: '#F5F3EF',
        purple: {
          DEFAULT: '#6B4FBB',
          light: '#8B7FC7',
          lighter: '#B5A9D8',
          dark: '#5A3FA0',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
        md: '0 1px 3px rgba(0, 0, 0, 0.08)',
        lg: '0 2px 4px rgba(0, 0, 0, 0.06)',
        xl: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      fontSize: {
        tiny: ['10px', '14px'],
      },
    },
  },
};
