import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
            if (id.includes('@stomp') || id.includes('sockjs-client')) return 'vendor-stomp';
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
          }
        },
      },
    },
  },
});
