import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// GitHub Pages 项目站：https://<user>.github.io/doc-bin/
const base = process.env.GITHUB_PAGES === '1' ? '/doc-bin/' : '/';

export default defineConfig({
  base,
  plugins: [vue()],
  server: {
    port: 5173,
  },
});
