/**
 * Tailwind-Konfiguration für „Imbiss Asia & Döner".
 *
 * Hier werden die Marken-Farben, Schriftarten und Komfort-Werte definiert.
 * → Farben ändern? HEX-Werte unter `theme.extend.colors` anpassen.
 * → Schriftarten ändern? `fontFamily` anpassen UND die Google-Fonts-<link>-Tags
 *   im <head> der HTML-Dateien austauschen.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dateien, die Tailwind-Klassen verwenden – damit ungenutztes CSS entfernt wird.
  content: ['./*.html', './assets/js/**/*.js'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1200px',
      },
    },
    extend: {
      colors: {
        // === Marken-Farbwelt (warm, appetitlich) ==========================
        // Basis: Creme / Off-White
        cream: {
          DEFAULT: '#FBF6EF',
          50: '#FFFDFA',
          100: '#FBF6EF',
          200: '#F3E8D9',
        },
        // Text-/Basisdunkel: Anthrazit
        charcoal: {
          DEFAULT: '#241F1C',
          light: '#403933',
          muted: '#6B635C',
        },
        // Hauptakzent: warmes Tomatenrot
        brand: {
          DEFAULT: '#E0402F',
          50: '#FCE9E6',
          100: '#F7C9C2',
          400: '#E85B4B',
          500: '#E0402F',
          600: '#C12C1D',
          700: '#9C2316',
        },
        // Zweitakzent: warmes Orange
        ember: {
          DEFAULT: '#F08A24',
          50: '#FDEEDC',
          100: '#FAD6AE',
          400: '#F39C45',
          500: '#F08A24',
          600: '#D57313',
        },
      },
      fontFamily: {
        // Überschriften: kräftig & freundlich
        display: ['Poppins', 'system-ui', 'sans-serif'],
        // Fließtext: gut lesbar
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(36, 31, 28, 0.22)',
        card: '0 4px 20px -8px rgba(36, 31, 28, 0.18)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s ease-out both',
        'fade-in': 'fade-in 1s ease-out both',
      },
    },
  },
  plugins: [],
};
