import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: { 
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'build/',
        '**/*.config.*',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    },
    globals: true
  },
  resolve: {
    alias: {
      '@tokpulse/shared': resolve(__dirname, './packages/shared/src'),
      '@tokpulse/db': resolve(__dirname, './packages/db/src'),
      '@tokpulse/api': resolve(__dirname, './packages/api/src'),
      '@tokpulse/ui': resolve(__dirname, './packages/ui/src')
    }
  }
});