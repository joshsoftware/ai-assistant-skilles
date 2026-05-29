/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

// Vite + Vitest config for BFSI starter. Notable:
//   - defineConfig imported from 'vitest/config' so the `test` key is typed
//     (importing from 'vite' rejects `test` with TS error "Object literal may
//     only specify known properties").
//   - SWC for fast transpile
//   - Path alias '@/' → 'src/'
//   - Server hardening headers (CSP set at deploy edge; dev runs without)
//   - HMR exposed only on localhost
//   - Bundle analyzer gated on `pnpm analyze` (npm_lifecycle_event is set by
//     pnpm/npm to the running script name — cross-platform, no cross-env dep)
const shouldAnalyze = process.env.npm_lifecycle_event === 'analyze';

export default defineConfig({
  plugins: [
    react(),
    ...(shouldAnalyze
      ? [
          visualizer({
            filename: 'dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
          i18n: ['react-i18next', 'i18next'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
