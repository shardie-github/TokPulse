import { defineConfig } from 'vite';
import { shopify } from '@shopify/hydrogen/vite';
import { react } from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    shopify({
      appDirectory: 'src',
      routes: {
        prefix: '/app',
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/state': resolve(__dirname, './src/state'),
      '@/pages': resolve(__dirname, './src/pages'),
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          shopify: ['@shopify/hydrogen', '@shopify/hydrogen-react'],
          polaris: ['@shopify/polaris', '@shopify/polaris-icons'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          state: ['zustand'],
          icons: ['lucide-react'],
          utils: ['axios', 'clsx', 'dayjs'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});