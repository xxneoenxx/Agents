import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

// Standalone-Build: erzeugt EINE eigenstaendige HTML-Datei (JS/CSS/Sprites inline),
// die per Doppelklick am Laptop und in Safari auf dem iPhone offline spielbar ist.
// PWA ist deaktiviert (kein ServiceWorker/Manifest noetig fuer eine Einzeldatei);
// die virtuelle pwa-register-Import bleibt als No-op aufloesbar.
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
  plugins: [VitePWA({ disable: true }), viteSingleFile()],
  build: {
    target: 'es2022',
    outDir: 'dist-standalone',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});
