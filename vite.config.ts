import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Drag_n_Drop/',
  plugins: [react()],
  server: {
    port: 5173
  }
});
