import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  // GitHub Pages deploys to /Clocktower_Token_Generator/ subpath
  base: '/Clocktower_Token_Generator/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/**/*', 'images/**/*', 'scripts/**/*'],
      manifest: {
        name: 'Blood on the Clocktower Token Generator',
        short_name: 'Token Generator',
        description: 'Create custom tokens for Blood on the Clocktower board game',
        theme_color: '#6C3BAA',
        background_color: '#1a1a2e',
        display: 'standalone',
        scope: '/Clocktower_Token_Generator/',
        start_url: '/Clocktower_Token_Generator/',
        orientation: 'any',
        categories: ['games', 'utilities'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,eot}'],
        // Don't precache PDF templates (large files, rarely used)
        globIgnores: ['**/avery_templates/**'],
        // Allow larger chunks for PWA precaching (main bundle is ~2.8MB)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
        runtimeCaching: [
          {
            // Cache external CDN scripts (jsPDF, jsZip, FileSaver, QRCode)
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // Cache Google Fonts webfonts
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache GitHub API responses (for character data sync)
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'github-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Cache GitHub raw content (character images)
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-images-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable in dev to avoid caching issues during development
      }
    })
  ],

  server: {
    port: 7221,
    open: true,
    host: true,
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,  // Clean old builds to prevent service worker bloat
  },

  optimizeDeps: {
    exclude: ['jspdf', 'file-saver', 'qrcodejs'],
    include: ['jszip']  // Include JSZip for proper CommonJS-to-ESM conversion
  }
});
