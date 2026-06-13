import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warme, rustikale Palette passend zum Bauernhof-Ambiente
        cream: "#f7f1e6",
        sand: "#efe4cf",
        bark: {
          DEFAULT: "#3d2b1f",
          light: "#5a4233",
        },
        forest: {
          DEFAULT: "#3c5a40",
          light: "#5b7d5e",
        },
        copper: {
          DEFAULT: "#a8602d",
          light: "#c47b41",
        },
        gold: "#c9a227",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(61, 43, 31, 0.25)",
        card: "0 4px 24px -8px rgba(61, 43, 31, 0.18)",
      },
      backgroundImage: {
        "grain":
          "radial-gradient(circle at 1px 1px, rgba(61,43,31,0.06) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
