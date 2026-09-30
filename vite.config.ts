import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // No GitHub Pages o app fica em /<nome-do-repositório>/; o workflow de deploy define BASE_PATH
  base: process.env.BASE_PATH || '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Os ícones já entram no precache pelo globPatterns abaixo
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
        // Caminhos relativos ao manifest, que fica na raiz do app (funciona com qualquer BASE_PATH)
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
        // Precache de tudo, inclusive public/pictogramas/*.png: o vocabulário inicial funciona offline
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Busca e imagens do ARASAAC usadas no editor: depois da primeira vez, vêm do cache
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
