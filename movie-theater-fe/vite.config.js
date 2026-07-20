import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      compression({ algorithm: 'gzip' }),
      compression({ algorithm: 'brotliCompress', ext: '.br' }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['NASAFILM.jpg'],
        manifest: {
          name: 'NASAFILM',
          short_name: 'NASAFILM',
          description: 'Đặt vé xem phim và xem phim trực tuyến',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/NASAFILM.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
            },
            {
              src: '/NASAFILM.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10485760, // 10 MiB
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2,br,gz}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/shared/components'),
        '@pages': path.resolve(__dirname, './src/features/*/pages'),
        '@hooks': path.resolve(__dirname, './src/shared/hooks'),
        '@services': path.resolve(__dirname, './src/services'),
        '@types': path.resolve(__dirname, './src/types'),
        '@utils': path.resolve(__dirname, './src/shared/utils'),
        '@assets': path.resolve(__dirname, './src/shared/assets'),
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/stomp': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/v1': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.VITE_API_KEY;
              if (apiKey) {
                proxyReq.setHeader('x-api-key', apiKey);
              }
            });
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('framer-motion')) return 'vendor-motion';
              if (id.includes('hls.js')) return 'vendor-player';
              if (id.includes('sockjs-client')) return 'vendor-sockjs';
              if (id.includes('@stomp')) return 'vendor-stomp';
              if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('@tanstack/react-query')) return 'vendor-query';
            }
            if (id.includes('/features/admin/pages/showtimes/Showtimes')) {
              return 'admin-showtimes-modals';
            }
            if (id.includes('/features/admin/layouts/AdminSidebar')) {
              return 'admin-sidebar';
            }
          },
        },
      },
    }
  };
});
