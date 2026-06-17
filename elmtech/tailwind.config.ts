import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: "#0b0f14",
          soft: "#11161d",
          card: "#161c25",
        },
        steel: {
          50: "#f1f5f9",
          200: "#cbd5e1",
          400: "#94a3b8",
          600: "#475569",
          800: "#1e293b",
        },
        brand: {
          DEFAULT: "#2f6df0",
          light: "#4f93ff",
          deep: "#1d4ed8",
        },
        cyan: {
          DEFAULT: "#38bdf8",
          soft: "#7dd3fc",
        },
        amber: {
          DEFAULT: "#e0a23c",
          soft: "#f5c469",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 60px -14px rgba(47, 109, 240, 0.55)",
        "glow-cyan": "0 0 60px -14px rgba(56, 189, 248, 0.5)",
        card: "0 24px 70px -28px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
