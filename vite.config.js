import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Match the production /api/jiosaavn proxy during local development.
  server: {
    proxy: {
      '/api/jiosaavn': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/api.php',
      },
      '/api/gaana': {
        target: 'https://gaana.com',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/apiv2',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://gaana.com');
            proxyReq.setHeader('Referer', 'https://gaana.com/');
            proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
          });
        },
      },
    },
  },
});
