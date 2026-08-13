import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api requests to the backend during local dev, so the frontend
// can just call fetch('/api/...') without hardcoding a host/port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
