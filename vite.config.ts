import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vitest/config'

export default defineConfig({
  plugins: [react() as unknown as Plugin],

  resolve: {
    alias: {
      '@':            path.resolve(__dirname, './src'),
      '@simulation':  path.resolve(__dirname, './src/simulation'),
      '@rendering':   path.resolve(__dirname, './src/rendering'),
      '@store':       path.resolve(__dirname, './src/store'),
      '@ui':          path.resolve(__dirname, './src/ui'),
      '@input':       path.resolve(__dirname, './src/input'),
      '@config':      path.resolve(__dirname, './src/config'),
      '@hooks':       path.resolve(__dirname, './src/hooks'),
      '@workers':     path.resolve(__dirname, './src/workers'),
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
    },
  },
})
