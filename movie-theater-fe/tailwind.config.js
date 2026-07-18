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
          deep: "#020203",
          base: "#050506",
          elevated: "#0a0a0c",
        },
        surface: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          hover: "rgba(255, 255, 255, 0.08)",
        },
        foreground: {
          DEFAULT: "#EDEDEF",
          muted: "#8A8F98",
          subtle: "#6B7078",
        },
        accent: {
          DEFAULT: "#E11D48",
          bright: "#F43F5E",
          glow: "rgba(225, 29, 72, 0.25)",
        },
      },
      boxShadow: {
        "linear-card":
          "0 0 0 1px rgba(255,255,255,0.06), 0 2px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
        "linear-card-hover":
          "0 0 0 1px rgba(255,255,255,0.1), 0 8px 28px rgba(0,0,0,0.5), 0 0 24px rgba(225,29,72,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
        "linear-btn":
          "inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 1px rgba(225,29,72,0.35), 0 0 12px rgba(225,29,72,0.25)",
        "linear-btn-hover":
          "inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 18px rgba(225,29,72,0.35)",
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
