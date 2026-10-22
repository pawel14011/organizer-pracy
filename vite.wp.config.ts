import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Konfiguracja budowania aplikacji dla wtyczki WordPress
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'wordpress-plugin/assets',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        entryFileNames: 'organizer-pracy.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'organizer-pracy.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
