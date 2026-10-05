/**
 * [INPUT]: 生成的 EdgeOne 中间件、真实 Request/Response 与隔离 JS 执行环境。
 * [OUTPUT]: API/缺失静态资源返回 404，真实资源和应用登录路由继续处理的行为回归。
 * [POS]: config/ 的部署路由合同测试，不读取私有会话或调用网络。
 * [PROTOCOL]: 行为合同变化时同步头部及 config/AGENTS.md。
 */
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { edgeoneMiddleware } from './edgeone-middleware'

const code = edgeoneMiddleware(['/assets/app.js', '/source/index.html', '/source/archive.part-000001', '/licenses/LICENSE'])
const { middleware } = runInNewContext(`${code.replace(/export /g, '')};\n({ middleware })`, { URL, Response }) as { middleware: (context: { request: Request; next: () => Response }) => Response }

describe('EdgeOne deployed route guard', () => {
  it.each(['/api/missing', '/assets/missing.js', '/source/missing.tar.gz', '/licenses/missing', '/icons/missing.png'])('returns 404 for %s without serving the SPA', path => {
    const next = vi.fn(() => new Response('<html>SPA</html>'))
    const response = middleware({ request: new Request(`https://site.test${path}`), next })
    expect(response.status).toBe(404)
    expect(next).not.toHaveBeenCalled()
  })
  it.each(['/login', '/login/', '/assets/app.js', '/source/index.html', '/source/archive.part-000001', '/licenses/LICENSE'])('preserves %s', path => {
    const next = vi.fn(() => new Response('asset'))
    expect(middleware({ request: new Request(`https://site.test${path}`), next }).status).toBe(200)
    expect(next).toHaveBeenCalledOnce()
  })
})
