import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const testSetupFile = fileURLToPath(new URL('./src/test-setup.ts', import.meta.url));

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
      events: path.resolve(__dirname, 'node_modules/events/events.js'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (/\/node_modules\/(?:react|react-dom)\//.test(id)) return 'react';
          if (/\/node_modules\/(?:zustand|zundo)\//.test(id)) return 'state';
          if (id.includes('/node_modules/react-router')) return 'router';
          if (
            /\/node_modules\/(?:i18next|react-i18next|i18next-browser-languagedetector)\//.test(id)
          )
            return 'i18n';
          if (/\/node_modules\/(?:jspdf|jspdf-autotable)\//.test(id)) return 'pdf';
          if (id.includes('/node_modules/jszip/')) return 'archive';
          if (/\/node_modules\/(?:yjs|y-webrtc|simple-peer)\//.test(id)) return 'collaboration';
          if (id.includes('/node_modules/@google/genai/')) return 'genai';
          if (id.includes('/node_modules/html2canvas/')) return 'vision_bundle';
          return undefined;
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
    // API keys must be stored via apiKeyService (localStorage), never bundled
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.LIP_SYNC_API_URL': JSON.stringify(process.env.LIP_SYNC_API_URL || ''),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  // @ts-expect-error vitest config is valid in defineConfig
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15_000,
    pool: 'forks',
    setupFiles: [testSetupFile],
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
        statements: 52,
        branches: 40,
        functions: 47,
        lines: 53,
      },
    },
  },
});
