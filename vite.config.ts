import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vitest/config'

export default defineConfig({
  plugins: [react() as unknown as Plugin],

  server: {
    headers: {
      // Permissive-but-explicit CSP for the dev server.
      // 'unsafe-inline' is required by R3F/Three.js shader compilation and
      // Vite's HMR injected scripts. 'blob:' is needed for Web Workers.
      // Tighten for production by removing 'unsafe-inline' once a nonce strategy is adopted.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "worker-src blob:",
        "connect-src 'self' ws://localhost:*",
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  },

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
    exclude: ['node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
    },
  },
})
