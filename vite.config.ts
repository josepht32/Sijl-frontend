import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['jquery'],
  },
  server: {
    proxy: {
      '/api': process.env.API_PROXY || 'http://localhost:3000',
    },
  },
})
