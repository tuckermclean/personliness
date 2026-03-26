import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://web:8000',
        changeOrigin: true
      },
      '/media': {
        target: 'http://web:8000',
        changeOrigin: true
      }
    }
  }
})
