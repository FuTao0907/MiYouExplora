import { defineConfig } from 'vitest/config'

// 单元测试配置：status.js 是纯函数（不依赖 Vue/DOM），用 node 环境即可
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  }
})
