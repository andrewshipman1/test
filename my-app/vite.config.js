import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev, proxy /api/chat to Anthropic directly (API key from .env)
      '/api/chat': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => '/v1/messages',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Read API key from .env (loaded by Vite)
            const apiKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
            if (apiKey) {
              proxyReq.setHeader('x-api-key', apiKey)
              proxyReq.setHeader('anthropic-version', '2023-06-01')
            }
            // Remove the dangerous-direct-browser-access header requirement
            // since this is now server-to-server via the proxy
          })
        },
      },
    },
  },
})
