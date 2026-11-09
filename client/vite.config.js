import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Same-origin /api (through the Vercel rewrite) or the Render API host directly.
// The short-lived socket token must never be cached.
const isApiRequest = ({ url }) =>
  url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/users/socket-token')

export default defineConfig({
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
      // Matches the API on the Render domain and same-origin /api (Vercel rewrite)
      urlPattern: isApiRequest,
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
      urlPattern: isApiRequest,
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
      urlPattern: isApiRequest,
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
      urlPattern: isApiRequest,
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
    })
  ],
})