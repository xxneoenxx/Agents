import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

// Entfernt nach dem Build type="module"/crossorigin vom (inline, IIFE-)Script,
// damit die Datei auch aus lokalen Dateien in Safari/iOS startet.
function classicScript(): Plugin {
  return {
    name: 'classic-script',
    closeBundle() {
      const file = fileURLToPath(new URL('./dist-standalone/index.html', import.meta.url));
      let html = readFileSync(file, 'utf8');
      // Klassisches Script (IIFE) statt ES-Modul.
      html = html.replace(/<script\s+type="module"[^>]*>/g, '<script>');
      // Absolute Verweise entfernen, die bei file:// fehlschlagen (Favicon/Manifest).
      html = html.replace(/<link\b[^>]*\brel="(icon|apple-touch-icon|manifest)"[^>]*>/g, '');
      writeFileSync(file, html);
    },
  };
}

// Standalone-Build: erzeugt EINE eigenstaendige HTML-Datei (JS/CSS/Sprites inline),
// die per Doppelklick am Laptop und in Safari auf dem iPhone offline spielbar ist.
//
// Wichtig fuer iOS/Safari: das gebuendelte Script wird als KLASSISCHES Script
// (IIFE) ausgegeben, nicht als ES-Modul. ES-Module aus lokalen Dateien (file://)
// werden von Safari blockiert -> die Datei wuerde sonst nicht starten.
// PWA ist deaktiviert (kein ServiceWorker/Manifest fuer eine Einzeldatei noetig).
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@game': fileURLToPath(new URL('./src/game', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
    },
  },
  plugins: [
    VitePWA({ disable: true }),
    viteSingleFile({ useRecommendedBuildConfig: false, removeViteModuleLoader: true }),
    classicScript(),
  ],
  build: {
    target: 'es2019',
    outDir: 'dist-standalone',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
      },
    },
  },
});
