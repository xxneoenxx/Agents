import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Vite-Konfiguration inkl. PWA-Grundgeruest und Pfad-Aliassen.
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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: "Bella's Food Empire",
        short_name: 'Food Empire',
        description: 'Ein 2D-Idle-Tycoon-Spiel: Baue dein Gastro-Imperium auf.',
        theme_color: '#FF8A3D',
        background_color: '#FFC24B',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    // Phaser ist als Engine bewusst gross; Warnschwelle entsprechend anheben.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Phaser in einen eigenen Chunk auslagern (besseres Caching, kleinerer
        // App-Chunk).
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
