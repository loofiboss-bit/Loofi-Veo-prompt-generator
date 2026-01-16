import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded relatively
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
    'process.env': process.env
  }
});