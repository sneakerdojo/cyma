import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Worker URL is configurable so dev can run alongside other services. Set
// WORKER_URL=http://localhost:3007 (etc.) when starting the dev server.
const workerUrl = process.env.WORKER_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    allowedHosts: true,
    proxy: {
      '/api': { target: workerUrl, changeOrigin: true },
      '/chat': { target: workerUrl, changeOrigin: true },
    },
  },
});
