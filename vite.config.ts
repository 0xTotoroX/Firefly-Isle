/**
 * [INPUT]: React/Tailwind Vite 插件、Vitest、Workbox 清单及 Node 文件/加密 API。
 * [OUTPUT]: Vite/Vitest 配置、历史归档测试排除、静态预缓存清单与 SHA-256 版本化 worker 构建插件。
 * [POS]: 根目录构建和测试装配；为 PWA 提供每个构建的静态资产与缓存版本，别名使用 import.meta.dirname。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { getManifest } from 'workbox-build'
import type { Plugin } from 'vite'

function precacheBuildAssets(): Plugin {
  let outDir = 'dist'
  return {
    name: 'firefly-precache-assets',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir },
    async closeBundle() {
      const { manifestEntries, warnings } = await getManifest({
        globDirectory: outDir,
        globPatterns: ['index.html', 'assets/**/*.{js,css,woff,woff2}', 'manifest.webmanifest', 'icons/*', 'logo-island-lighthouse.ico'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      })
      if (warnings.length) throw new Error(warnings.join('\n'))
      const source = await readFile(path.resolve('public/sw.js'), 'utf8')
      const revision = createHash('sha256').update(source).update(JSON.stringify(manifestEntries)).digest('hex').slice(0, 16)
      await writeFile(path.join(outDir, 'sw.js'), source
        .replace('self.__WB_MANIFEST || []', JSON.stringify(manifestEntries.filter((entry) => entry.url !== 'index.html')))
        .replace('firefly-pwa-v2', `firefly-pwa-v2-${revision}`))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), precacheBuildAssets()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, 'archive/**'],
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
