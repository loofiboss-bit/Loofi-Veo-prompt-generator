import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
);

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded relatively
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/@google/genai/')) return 'vendor-ai';
            if (id.includes('/@ffmpeg/')) return 'vendor-ffmpeg';
            if (id.includes('/@xenova/transformers/')) return 'vendor-ml';
            if (id.includes('/jspdf/') || id.includes('/jspdf-autotable/') || id.includes('/jszip/')) return 'vendor-export';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 8080
  },
  preview: {
    host: true,
    port: 8080,
    allowedHosts: true
  },
  define: {
    'process.env': process.env,
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  }
});
