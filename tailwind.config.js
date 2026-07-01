/**
 * Tailwind-Konfiguration für „Atelier Götz – Coiffeur & Barbier".
 *
 * Hier werden die Marken-Farben, Schriftarten und ein paar Komfort-Werte definiert.
 * → Farben ändern? Passe die HEX-Werte unter `theme.extend.colors` an.
 * → Schriftarten ändern? Passe `fontFamily` an UND tausche die <link>-Tags der
 *   Google Fonts im <head> jeder HTML-Datei aus.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Alle Dateien, die Tailwind-Klassen verwenden, müssen hier erfasst sein,
  // damit ungenutzte CSS-Klassen aus dem Build entfernt werden (kleine Dateigröße).
  content: ['./*.html', './assets/js/**/*.js'],
  theme: {
    // Zentraler Container: mittig, mit angenehmen Innenabständen.
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
        // === Marken-Farbwelt (warm, natürlich, hochwertig) =================
        // Basis: Creme / Off-White
        cream: {
          DEFAULT: '#F7F2EA',
          50: '#FDFBF7',
          100: '#F7F2EA',
          200: '#EFE6D7',
        },
        // Akzent: warmes Terracotta / Lehm
        terracotta: {
          DEFAULT: '#B5673F',
          50: '#F6E9E1',
          100: '#E9CBB9',
          400: '#C57B52',
          500: '#B5673F',
          600: '#9A5331',
          700: '#7E4327',
        },
        // Zweitakzent: Salbeigrün
        sage: {
          DEFAULT: '#8A9A7B',
          50: '#EEF1EA',
          100: '#D8E0CF',
          400: '#9DAB8F',
          500: '#8A9A7B',
          600: '#6F7E61',
          700: '#586549',
        },
        // Text: Anthrazit
        anthracite: {
          DEFAULT: '#2A2A28',
          light: '#4A4A46',
          muted: '#6E6E68',
        },
      },
      fontFamily: {
        // Überschriften: elegante Serife
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        // Fließtext: gut lesbare Sans-Serif
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(42, 42, 40, 0.18)',
        card: '0 4px 20px -8px rgba(42, 42, 40, 0.15)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      // Sanfte Einstiegs-Animationen (Hero).
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
