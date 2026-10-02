import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false,
      manifest: {
        name: 'Comunicador Alternativo',
        short_name: 'Comunicador',
        description:
          'Comunicador por pictogramas gratuito para Comunicação Aumentativa e Alternativa (CAA).',
        lang: 'pt-BR',
        dir: 'ltr',
        display: 'standalone',
        theme_color: '#0b5cad',
        background_color: '#f4f4f0',
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
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(api|static)\.arasaac\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arasaac',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
  },
})
