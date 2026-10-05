/**
 * [INPUT]: wrangler.jsonc 的公开 VITE_ 配置、edgeone.json 与现有 npm build。
 * [OUTPUT]: 使用已审核后端环境构建 dist，并附带 EdgeOne 路由/安全头配置及资源 404 保护。
 * [POS]: config/ 的腾讯云前端构建入口；不复制账户凭据或部署 Cloudflare 微信 Functions。
 * [PROTOCOL]: 入口、依赖或产物变化时同步 config/AGENTS.md 与部署手册。
 */
import { readFileSync, copyFileSync, readdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { edgeoneMiddleware } from './edgeone-middleware.ts'

const root = path.resolve(import.meta.dirname, '..')
const config = JSON.parse(readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8')) as { vars: Record<string, string> }
const publicVars = Object.fromEntries(Object.entries(config.vars).filter(([key]) => key.startsWith('VITE_')))
const result = spawnSync('npm', ['run', 'build'], { cwd: root, env: { ...process.env, ...publicVars }, stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
copyFileSync(path.join(root, 'edgeone.json'), path.join(root, 'dist/edgeone.json'))

function assetPaths(directory: string, relative = ''): string[] {
  return readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap(entry => {
    const name = relative ? `${relative}/${entry.name}` : entry.name
    return entry.isDirectory() ? assetPaths(directory, name) : [`/${name}`]
  })
}
writeFileSync(path.join(root, 'dist/middleware.js'), edgeoneMiddleware(assetPaths(path.join(root, 'dist'))))
