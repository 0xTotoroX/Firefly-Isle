import { defineConfig } from 'vitest/config'
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
