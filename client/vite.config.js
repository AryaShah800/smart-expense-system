import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Upload source maps to Sentry only when the build has credentials (set in Vercel).
const uploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
)

export default defineConfig({
  build: {
    // 'hidden' writes maps without a sourceMappingURL comment; they are deleted after upload.
    sourcemap: uploadSourceMaps ? 'hidden' : false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Smart Expense System',
        short_name: 'SmartExpense',
        description: 'Track and manage your expenses',
        theme_color: '#f8fafc',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
  runtimeCaching: [
    {
      // Match the full Render domain
      urlPattern: /^https:\/\/smart-expense-system-api\.onrender\.com\/api\/.*/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7
        },
        cacheableResponse: {
          statuses: [0, 200]
        },
        networkTimeoutSeconds: 5  // ADD THIS — fallback to cache after 5s
      }
    },
    {
      urlPattern: /^https:\/\/smart-expense-system-api\.onrender\.com\/api\/.*/i,
      handler: 'NetworkOnly',
      method: 'POST',
      options: {
        backgroundSync: {
          name: 'offline-mutations-queue',
          options: { maxRetentionTime: 24 * 60 }
        }
      }
    },
    {
      urlPattern: /^https:\/\/smart-expense-system-api\.onrender\.com\/api\/.*/i,
      handler: 'NetworkOnly',
      method: 'PUT',
      options: {
        backgroundSync: {
          name: 'offline-mutations-queue',
          options: { maxRetentionTime: 24 * 60 }
        }
      }
    },
    {
      urlPattern: /^https:\/\/smart-expense-system-api\.onrender\.com\/api\/.*/i,
      handler: 'NetworkOnly',
      method: 'DELETE',
      options: {
        backgroundSync: {
          name: 'offline-mutations-queue',
          options: { maxRetentionTime: 24 * 60 }
        }
      }
    }
  ]
}
    }),
    uploadSourceMaps &&
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        telemetry: false,
      }),
  ],
})