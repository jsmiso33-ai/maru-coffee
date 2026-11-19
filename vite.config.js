import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages 프로젝트 페이지(https://<user>.github.io/maru-coffee/)로 배포할 때는
// 빌드 시 BASE_PATH=/maru-coffee/ 를 넘긴다. 커스텀 도메인이면 기본값 '/' 그대로.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5180, host: true },
});
