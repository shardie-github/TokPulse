import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react','react-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          state: ['zustand'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: { port: 5173 }
})
