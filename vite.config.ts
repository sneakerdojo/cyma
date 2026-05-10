import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Worker URL is configurable so dev can run alongside other services that
// already occupy the default port 3005. Set WORKER_URL=http://localhost:3007
// (etc.) when starting the dev server to override.
const workerUrl = process.env.WORKER_URL ?? 'http://localhost:3005';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  optimizeDeps: {
    // exclude: ['lucide-react'],
  },
  server: {
    // Allow remote tunnels (ngrok, Cloudflare, etc.) to connect to the dev
    // server. Vite 5+ rejects non-localhost Host headers by default.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: workerUrl,
        changeOrigin: true,
      },
      '/chat': {
        target: workerUrl,
        changeOrigin: true,
      },
    },
  },
});
