import { defineConfig } from 'vite';

export default defineConfig({
  // 使用相对路径，方便打包后在本地直接打开
  base: './',
  server: {
    port: 5173,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1500
  }
});
