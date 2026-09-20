import { defineConfig } from 'vite'
import { createApiDevMiddleware } from './api/devMiddleware.js'

export default defineConfig({
  plugins: [{
    name: 'cerebro-same-origin-api',
    configureServer(server) {
      server.middlewares.use(createApiDevMiddleware())
    },
  }],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/maplibre-gl/')) return 'maplibre'
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'react-vendor'
        },
      },
    },
  },
})
