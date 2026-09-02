import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#070711",
          soft: "#0e0e1c",
          card: "#15152a",
        },
        gold: {
          DEFAULT: "#f5c542",
          soft: "#fbe08a",
          deep: "#c9971f",
        },
        crimson: {
          DEFAULT: "#e11d48",
          soft: "#fb7185",
        },
        violet: {
          DEFAULT: "#7c3aed",
          soft: "#a78bfa",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 60px -12px rgba(245, 197, 66, 0.45)",
        "glow-crimson": "0 0 60px -12px rgba(225, 29, 72, 0.5)",
        card: "0 20px 60px -20px rgba(0,0,0,0.7)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        shimmer: "shimmer 3s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
