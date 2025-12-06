import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  publicDir: 'assets',

  plugins: [react()],

  server: {
    port: 7221,
    open: true,
    host: true,
  },

  build: {
    outDir: 'dist',
    emptyOutDir: false,
  },

  optimizeDeps: {
    exclude: ['jspdf', 'file-saver', 'qrcodejs'],
    include: ['jszip']  // Include JSZip for proper CommonJS-to-ESM conversion
  }
});
