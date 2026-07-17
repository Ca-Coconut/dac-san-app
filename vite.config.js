import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Bắt buộc cho Capacitor: app chạy từ file:// trong WebView Android
  plugins: [react()],
  server: {
    host: true, // Cho phép truy cập từ thiết bị khác
    port: 5174, // Giữ nguyên port
  },
});
