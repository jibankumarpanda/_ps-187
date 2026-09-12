import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        foreground: '#FAFAFA',
        muted: '#1A1A1A',
        mutedForeground: '#737373',
        accent: '#FF3D00',
        accentForeground: '#0A0A0A',
        border: '#262626',
        input: '#1A1A1A',
        card: '#0F0F0F',
        cardForeground: '#FAFAFA',
        ring: '#FF3D00',
        
        // Legacy colors mapped to new system for safety
        ibvap: {
          bg: '#0A0A0A',
          'bg-secondary': '#1A1A1A',
          surface: '#0F0F0F',
          'surface-elevated': '#1A1A1A',
          border: '#262626',
          'border-strong': '#737373',
          'text-primary': '#FAFAFA',
          'text-secondary': '#737373',
          'text-muted': '#737373',
          'text-disabled': '#737373',
          accent: '#FF3D00',
          success: '#39D98A',
          warning: '#F4C95D',
          danger: '#FF5C67',
          'high-threat': '#FF3D00',
          info: '#FAFAFA',
          sidebar: '#0F0F0F',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
        tight: ['var(--font-inter-tight)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.06em',
        tight: '-0.04em',
        normal: '-0.01em',
        wide: '0.05em',
        wider: '0.1em',
        widest: '0.2em',
      },
      lineHeight: {
        none: '1',
        tight: '1.1',
        snug: '1.25',
        normal: '1.6',
        relaxed: '1.75',
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.25, 0, 0, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.25, 0, 0, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
