/**
 * [INPUT]: 生成的 EdgeOne 中间件、同步 next 控制响应、部署头与隔离 JS 执行环境。
 * [OUTPUT]: 缺失资源不缓存、真实静态读取长期缓存、公开文件和登录路由保持透传的行为回归。
 * [POS]: config/ 的部署路由合同测试，不读取私有会话或调用网络。
 * [PROTOCOL]: 行为合同变化时同步头部及 config/AGENTS.md。
 */
import { runInNewContext } from 'node:vm'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { edgeoneMiddleware } from './edgeone-middleware'

const code = edgeoneMiddleware(['/assets/app.js', '/assets/pdf.worker.mjs', '/icons/icon.png', '/source/index.html', '/source/archive.part-000001', '/licenses/LICENSE', '/login/coast.png'])
const { middleware } = runInNewContext(`${code.replace(/export /g, '')};\n({ middleware })`, { URL, Response }) as { middleware: (context: { request: Request; next: () => Response }) => Response }

function nextResponse() {
  return new Response(null, { headers: { 'x-middleware-next': '1', 'X-Existing': 'preserved' } })
}

describe('EdgeOne deployed route guard', () => {
  it.each(['/api', '/api/missing', '/assets/missing.js', '/source/missing.tar.gz', '/licenses/missing', '/icons/missing.png', '/login/missing.png', '/assets/%E0%A4%A'])('returns an uncacheable 404 for %s without serving the SPA', path => {
    const next = vi.fn(nextResponse)
    const response = middleware({ request: new Request(`https://site.test${path}`), next })
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(next).not.toHaveBeenCalled()
  })
  it.each(['/login', '/login/', '/', '/app', '/demo/app', '/sw.js', '/manifest.webmanifest', '/source/index.html', '/source/archive.part-000001', '/licenses/LICENSE', '/login/coast.png'])('preserves pass-through and revalidation for %s', path => {
    const control = nextResponse()
    const next = vi.fn(() => control)
    const response = middleware({ request: new Request(`https://site.test${path}`), next })
    expect(response).toBe(control)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('X-Existing')).toBe('preserved')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
    expect(next).toHaveBeenCalledOnce()
  })

  it.each([
    ['GET', '/assets/app.js'], ['HEAD', '/assets/app.js'],
    ['GET', '/assets/pdf.worker.mjs'], ['HEAD', '/icons/icon.png'],
  ])('keeps long caching for a listed %s %s without replacing the next control response', (method, path) => {
    const control = nextResponse()
    const response = middleware({ request: new Request(`https://site.test${path}`, { method }), next: () => control })
    expect(response).toBe(control)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })

  it('does not assign immutable caching to a non-reading asset request', () => {
    const response = middleware({ request: new Request('https://site.test/assets/app.js', { method: 'POST' }), next: nextResponse })
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it.each(['/icons/missing.png', '/%E0%A4%A'])('keeps the HEAD 404 for %s bodyless and uncacheable', async path => {
    const next = vi.fn(nextResponse)
    const response = middleware({ request: new Request(`https://site.test${path}`, { method: 'HEAD' }), next })
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.body).toBeNull()
    expect(await response.text()).toBe('')
    expect(next).not.toHaveBeenCalled()
  })

  it('keeps platform path-wide headers from overriding the middleware cache policy', () => {
    const config = JSON.parse(readFileSync(new URL('../edgeone.json', import.meta.url), 'utf8')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
    }
    const overlapping = config.headers.filter(group => ['/*', '/assets/*', '/icons/*'].includes(group.source))
    expect(overlapping.flatMap(group => group.headers).some(header => header.key.toLowerCase() === 'cache-control')).toBe(false)
  })
})
