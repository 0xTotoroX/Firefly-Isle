import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // 默认 node 环境跑源码合同测试；DOM 交互测试用文件头 @vitest-environment happy-dom 按需开启。
    environment: 'node',
    // globals 开启 testing-library 的自动 cleanup，DOM 测试无需每个文件手动卸载。
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*'],
    },
  },
})
