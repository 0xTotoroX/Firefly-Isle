/**
 * [INPUT]: 安装的 pdfjs-dist CMap、标准字体及图像解码资源。
 * [OUTPUT]: pdfjsAssets 为开发服务和生产构建提供同源 /assets/pdfjs/ 资源。
 * [POS]: config/ 的 PDF 渲染资源装配，不从 CDN 获取患者文档所需的解析资源。
 * [PROTOCOL]: 资源路径或职责变化时更新此头部及 config/AGENTS.md。
 */
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { Plugin } from 'vite'

export function pdfjsAssets(): Plugin {
  const root = path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))
  let build = false
  const files = new Map<string, string>()
  const collect = async () => {
    for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
      for (const name of await readdir(path.join(root, directory))) {
        files.set(`assets/pdfjs/${directory}/${name}`, path.join(root, directory, name))
      }
    }
  }
  return {
    name: 'firefly-pdfjs-assets',
    configResolved(config) { build = config.command === 'build' },
    async configureServer(server) {
      await collect()
      server.middlewares.use(async (request, response, next) => {
        const file = files.get((request.url ?? '').split('?')[0].replace(/^\//, ''))
        if (!file) return next()
        try {
          response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
          response.end(await readFile(file))
        } catch (error) { next(error as Error) }
      })
    },
    async buildStart() {
      if (!build) return
      await collect()
      for (const [fileName, file] of files) {
        this.emitFile({ type: 'asset', fileName, source: await readFile(file) })
      }
    },
  }
}
