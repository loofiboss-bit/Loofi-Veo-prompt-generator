import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded relatively
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
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