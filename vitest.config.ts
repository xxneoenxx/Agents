import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Eigene Vitest-Konfiguration, damit die Vite-Plugin-Typen (PWA) in vite.config.ts
// nicht mit Vitests gebuendelter Vite-Version kollidieren. Testet nur core/-Logik.
export default defineConfig({
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@game': fileURLToPath(new URL('./src/game', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
