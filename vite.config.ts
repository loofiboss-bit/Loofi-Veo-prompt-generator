import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // FIX: Use path.resolve('.') instead of process.cwd() to verify current directory without TS errors on 'process'
    const env = loadEnv(mode, path.resolve('.'), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // FIX: Use path.resolve('.') instead of process.cwd()
          '@': path.resolve('.'),
        }
      }
    };
});