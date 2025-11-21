import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-widget',
    rollupOptions: {
      input: path.resolve(__dirname, 'src/widget/main.jsx'),
      output: {
        entryFileNames: 'widget-bundle.js',
        chunkFileNames: 'widget-[name].js',
        assetFileNames: 'widget-[name].[ext]'
      }
    }
  },
  define: {
    'process.env': {} // Polyfill for process.env if needed by some libs
  }
});

