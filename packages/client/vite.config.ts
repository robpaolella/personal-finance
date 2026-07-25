import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Uploaded images (account avatars, merchant + institution logos) are
      // served by the API host; proxy them so <img src="/uploads/..."> works in dev.
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['../..'],
    },
  },
});
