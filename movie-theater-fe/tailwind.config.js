/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "sans-serif"],
        heading: ["Montserrat", "sans-serif"],
        ui: ["Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        background: {
          deep: "var(--nf-bg-deep)",
          base: "var(--nf-bg-app)",
          elevated: "var(--nf-bg-elevated)",
        },
        surface: {
          DEFAULT: "var(--nf-surface)",
          hover: "var(--nf-surface-hover)",
        },
        foreground: {
          DEFAULT: "var(--nf-text)",
          muted: "var(--nf-text-muted)",
          subtle: "var(--nf-text-dim)",
        },
        accent: {
          DEFAULT: "var(--nf-accent)",
          bright: "var(--nf-accent-bright)",
          glow: "var(--nf-accent-glow)",
        },
      },
      boxShadow: {
        "linear-card":
          "0 0 0 1px var(--nf-border), 0 2px 20px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
        "linear-card-hover":
          "0 0 0 1px var(--nf-border-strong), 0 8px 28px rgba(0,0,0,0.22), 0 0 24px var(--nf-accent-glow), inset 0 1px 0 rgba(255,255,255,0.08)",
        "linear-btn":
          "inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 1px rgba(225,29,72,0.35), 0 0 12px var(--nf-accent-glow)",
        "linear-btn-hover":
          "inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 18px var(--nf-accent-glow)",
      },
      transitionTimingFunction: {
        "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(3%, -5%) scale(1.06)" },
          "66%": { transform: "translate(-4%, 4%) scale(0.95)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.85)" },
        },
      },
      animation: {
        float: "float 18s ease-in-out infinite",
        "float-slow": "float 26s ease-in-out infinite reverse",
        "float-mid": "float 22s ease-in-out infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
