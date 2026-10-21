import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /api/n8n requests to the n8n recommendation webhook (production)
      '/api/n8n': {
        target: 'https://akalya.app.n8n.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, '/webhook/9ab4524a-1fc4-4509-8445-34210ebeb486'),
        secure: true,
      },
      // Forward /api/legal-aid-request to the n8n request-review webhook (production)
      '/api/legal-aid-request': {
        target: 'https://akalya.app.n8n.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/legal-aid-request/, '/webhook/legal-aid/request'),
        secure: true,
      },
    },
  },
})
