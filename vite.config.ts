import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded relatively
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          state: ['zustand', 'zundo'],
          export: ['jspdf', 'jspdf-autotable', 'jszip'],
          collaboration: ['yjs', 'y-webrtc', 'simple-peer'],
          genai: ['@google/genai'],
          vision_bundle: ['html2canvas'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 8080,
  },
  preview: {
    host: true,
    port: 8080,
    allowedHosts: true,
  },
  define: {
    // Explicit allowlist — never expose the full process.env to the client bundle
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.LIP_SYNC_API_URL': JSON.stringify(process.env.LIP_SYNC_API_URL || ''),
    'process.env.LIP_SYNC_API_KEY': JSON.stringify(process.env.LIP_SYNC_API_KEY || ''),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  // @ts-expect-error vitest config is valid in defineConfig
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test-utils.tsx',
        'src/test-setup.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        statements: 20,
        branches: 15,
        functions: 20,
        lines: 21,
      },
    },
  },
});
