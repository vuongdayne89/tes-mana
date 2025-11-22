import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Quan trọng: Giúp app chạy được cả trong thư mục con trên hosting
  build: {
    outDir: 'dist',
  },
});