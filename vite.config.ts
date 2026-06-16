import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3200,
    proxy: {
      '/api': {
        // 避免 Windows 下 localhost 双栈解析触发 Vite 代理 ENOBUFS
        target: 'http://[::1]:3201',
        changeOrigin: true,
      },
    },
  },
});
