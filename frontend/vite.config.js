import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow connections from outside the container (required for Docker + Nginx)
    host: '0.0.0.0',
    proxy: {
      // In development, forward /api calls to the Flask backend.
      // This works both inside Docker (backend:5000) and locally.
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://backend:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
