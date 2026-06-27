import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        graphit: "#14181C",
        "graphit-2": "#191E24",
        stahl: "#232A31",
        "stahl-2": "#2C343D",
        alu: {
          DEFAULT: "#C3CBD3",
          dark: "#7E8A95",
          line: "#3A434D",
        },
        adr: {
          DEFAULT: "#F2A516",
          soft: "#F8C45E",
        },
        glut: "#FF5A1F",
        papier: "#ECEDEF",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        ultra: "0.32em",
      },
      backgroundImage: {
        "alu-brushed":
          "linear-gradient(135deg, #C3CBD3 0%, #9AA6B0 38%, #7E8A95 60%, #B4BEC7 100%)",
        "grid-fine":
          "linear-gradient(to right, rgba(58,67,77,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(58,67,77,0.35) 1px, transparent 1px)",
      },
      keyframes: {
        "spark-float": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-120px) scale(0.4)", opacity: "0" },
        },
        "scan-line": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "spark-float": "spark-float 2.4s ease-out infinite",
        "scan-line": "scan-line 3s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
