import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

import { cloudflare } from "@cloudflare/vite-plugin";

// Vite config. `base` must match the GitHub Pages subpath:
// the app will live at https://alessiofalconaro.github.io/route-66/
export default defineConfig({
  base: '/route-66/',
  plugins: [react(), tailwindcss(), VitePWA({
    // autoUpdate = when we deploy a new version, the service worker
    // refreshes the cached files automatically on next visit.
    registerType: 'autoUpdate',
    manifest: {
      name: 'Route 66 Trip Companion',
      short_name: 'Route 66',
      description: 'Chicago → Los Angeles road trip companion, Aug 2026',
      theme_color: '#b91c1c',
      background_color: '#fafaf9',
      display: 'standalone',
      orientation: 'portrait',
      // start_url / scope are relative to the Pages subpath
      start_url: '.',
      scope: '.',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: 'icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // Cache every built asset so the whole app works in airplane mode.
      globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,ico,json,woff2}'],
      // POI photos push the precache past workbox's 2 MiB-per-file default
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      // If a POI ever uses a Wikimedia Commons photo URL, cache it after
      // the first view so it is available offline afterwards.
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/upload\.wikimedia\.org\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'wikimedia-images',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 90 },
          },
        },
      ],
    },
  }), cloudflare()],
});