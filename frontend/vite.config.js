import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/satya/',
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/satya/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/satya\/api/, '/api')
      }
    }
  }
})
