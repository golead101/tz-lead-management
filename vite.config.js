import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'image-removebg-preview.png'],
      manifest: {
        name: 'TechZone Lead Management',
        short_name: 'Lead CRM',
        description: 'Lead Management CRM System',
        theme_color: '#f4f6fc',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/image-removebg-preview.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/image-removebg-preview.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/image-removebg-preview.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  envPrefix: ['VITE_', 'GOOGLE_ADS_', 'META_', 'VERIFY_TOKEN', 'WHATSAPP_']
})
