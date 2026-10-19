import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: {
    proxy: {
      // 开发环境图片下载代理：/api/img/assets/UI/xxx.png → https://gi.yatta.moe/assets/UI/xxx.png
      // （与生产 functions/api/img 同构：前端只拼 /api/img + 图片同构路径，两端行为一致）
      '/api/img': {
        target: 'https://gi.yatta.moe',
        changeOrigin: true,
        // 目标站可能校验 UA / Referer（防盗链），按真实浏览器请求头转发
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Referer: 'https://gi.yatta.moe/',
        },
        rewrite: (p) => p.replace(/^\/api\/img/, ''),
      },
    },
  },
})
