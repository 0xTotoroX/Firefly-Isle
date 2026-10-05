/**
 * [INPUT]: 依赖 node:fs、node:path、vitest、public manifest/sw/header/redirect 文件与 ./pwa。
 * [OUTPUT]: 对外提供 PWA 安装元数据、service worker 注册条件与隐私缓存边界合同测试。
 * [POS]: src/lib 的 PWA 合同测试，确保 manifest 可安装、生产安全上下文才注册 SW、动态医疗 API 不进入 Cache Storage。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

import { describe, expect, it, vi } from 'vitest'

import { canRegisterFireflyServiceWorker, isSensitivePwaRequestUrl, registerFireflyServiceWorker } from './pwa'

function readPublicFile(path: string) {
  return readFileSync(resolve(process.cwd(), 'public', path), 'utf8')
}

describe('PWA install metadata', () => {
  it('defines an installable manifest with normal and maskable icons', () => {
    const manifest = JSON.parse(readPublicFile('manifest.webmanifest')) as {
      display?: string
      icons?: Array<{ purpose?: string; sizes?: string; src?: string; type?: string }>
      name?: string
      scope?: string
      start_url?: string
    }

    expect(manifest.name).toContain('MyOncode')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', src: '/icons/firefly-pwa-192.png', type: 'image/png' }),
        expect.objectContaining({ sizes: '512x512', src: '/icons/firefly-pwa-512.png', type: 'image/png' }),
        expect.objectContaining({ purpose: 'maskable', sizes: '512x512', src: '/icons/firefly-maskable-512.png' }),
      ]),
    )
  })

  it('serves manifest, icons and service worker with explicit cache headers', () => {
    const headers = readPublicFile('_headers')

    expect(headers).toContain('/icons/*')
    expect(headers).toContain('/manifest.webmanifest')
    expect(headers).toContain('Content-Type: application/manifest+json; charset=utf-8')
    expect(headers).toContain('/sw.js')
    expect(headers).toContain('Cache-Control: public, max-age=0, must-revalidate')
    const csp = headers.split('\n').find((line) => line.includes('Content-Security-Policy:')) ?? ''
    const connect = csp.split(';').find((directive) => directive.trim().startsWith('connect-src ')) ?? ''
    expect(connect.split(/\s+/)).toContain('https://supabase.ghibli1024.com')
  })

  it('keeps installed PWA deep links inside the SPA fallback', () => {
    const redirects = readPublicFile('_redirects')

    expect(redirects).toContain('/auth/callback / 200')
    expect(redirects).toContain('/analytics/* / 200')
    expect(redirects).toContain('/demo/* / 200')
    expect(redirects).toContain('/share/* / 200')
  })
})

describe('PWA service worker boundary', () => {
  it('registers only in enabled secure service worker contexts', () => {
    const navigatorWithServiceWorker = { serviceWorker: { register: vi.fn() } } as unknown as Navigator
    const insecureLocation = { hostname: 'example.test', protocol: 'http:' } as Location
    const secureLocation = { hostname: 'firefly.ghibli1024.com', protocol: 'https:' } as Location

    expect(canRegisterFireflyServiceWorker({ location: insecureLocation, navigator: navigatorWithServiceWorker }, true)).toBe(false)
    expect(canRegisterFireflyServiceWorker({ location: secureLocation, navigator: {} as Navigator }, true)).toBe(false)
    expect(canRegisterFireflyServiceWorker({ location: secureLocation, navigator: navigatorWithServiceWorker }, false)).toBe(false)
    expect(canRegisterFireflyServiceWorker({ location: secureLocation, navigator: navigatorWithServiceWorker }, true)).toBe(true)
  })

  it('registers /sw.js after window load when eligible', () => {
    const register = vi.fn().mockResolvedValue({})
    const listeners = new Map<string, EventListenerOrEventListenerObject>()
    const target = {
      addEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
        listeners.set(event, listener)
      }),
      location: { hostname: 'localhost', protocol: 'http:' } as Location,
      navigator: { serviceWorker: { register } } as unknown as Navigator,
    }

    expect(registerFireflyServiceWorker(target, true)).toBe(true)
    const loadListener = listeners.get('load')

    expect(loadListener).toBeTypeOf('function')
    ;(loadListener as EventListener)(new Event('load'))
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('treats Supabase, Edge Functions and same-origin API paths as sensitive', () => {
    expect(isSensitivePwaRequestUrl('https://supabase.ghibli1024.com/auth/v1/token')).toBe(true)
    expect(isSensitivePwaRequestUrl('https://supabase.ghibli1024.com/functions/v1/llm-proxy')).toBe(true)
    expect(isSensitivePwaRequestUrl('https://irkjblpzmclqekxbexll.supabase.co/auth/v1/token')).toBe(true)
    expect(isSensitivePwaRequestUrl('https://irkjblpzmclqekxbexll.functions.supabase.co/llm-proxy')).toBe(true)
    expect(isSensitivePwaRequestUrl('https://firefly.ghibli1024.com/api/auth/wechat/token')).toBe(true)
    expect(isSensitivePwaRequestUrl('https://firefly.ghibli1024.com/assets/index.js')).toBe(false)
  })

  it('keeps dynamic medical data out of the service worker cache allowlist', () => {
    const serviceWorkerSource = readPublicFile('sw.js')

    expect(serviceWorkerSource).toContain("'.supabase.co'")
    expect(serviceWorkerSource).toContain("'.functions.supabase.co'")
    expect(serviceWorkerSource).toContain("'/api/'")
    expect(serviceWorkerSource).toContain('request.method !==')
    expect(serviceWorkerSource).toContain('cache.match(APP_SHELL_URL')
    expect(serviceWorkerSource).not.toContain('record_shares')
    expect(serviceWorkerSource).not.toContain('patients')
    expect(serviceWorkerSource).not.toContain('lab_results')
  })
})

// Execute the shipped worker; response URLs are checked independently of cache keys.
function workerHarness(buildAssets: Array<{ url: string }> = []) {
  const origin = 'https://firefly.test'
  const entries = new Map<string, Response>()
  const listeners = new Map<string, (event: unknown) => void>()
  const cache = {
    match: vi.fn(async (key: string | Request) => entries.get(typeof key === 'string' ? key : key.url)?.clone()),
    put: vi.fn(async (key: string | Request, response: Response) => {
      entries.set(typeof key === 'string' ? key : key.url, response)
    }),
    addAll: vi.fn<(requests: Request[]) => Promise<void>>().mockResolvedValue(undefined),
  }
  const response = (url: string, body = 'public shell'): Response => {
    const value = new Response(body, { headers: { 'Content-Type': 'text/html' } })
    Object.defineProperties(value, {
      url: { value: url },
      type: { value: 'basic' },
      clone: { value: () => response(url, body) },
    })
    return value
  }
  const fetch = vi.fn(async (request: Request) => response(request.url))
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ['firefly-pwa-v1-static', 'unrelated-cache']),
    delete: vi.fn(async () => true),
  }
  runInNewContext(readPublicFile('sw.js'), {
    URL, Request, Response, caches, fetch,
    self: { __WB_MANIFEST: buildAssets, skipWaiting: vi.fn(), location: { origin }, addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener), clients: { claim: vi.fn() } },
  })
  function request(path: string, mode = 'navigate') {
    let result: Promise<Response> | undefined
    listeners.get('fetch')!({ request: { url: origin + path, method: 'GET', mode }, respondWith: (value: Promise<Response>) => { result = value } })
    return result
  }
  return { origin, entries, cache, caches, listeners, fetch, request, response }
}

describe('PWA source downloads', () => {
  it('does not replace source or license documents with the cached application shell', () => {
    const worker = workerHarness()
    worker.entries.set('/index.html', worker.response(worker.origin + '/index.html'))
    expect(worker.request('/source/index.html')).toBeUndefined()
    expect(worker.request('/source/myoncode-source-example.tar.gz')).toBeUndefined()
    expect(worker.request('/licenses/LICENSE')).toBeUndefined()
    expect(worker.cache.match).not.toHaveBeenCalled()
  })
})

describe('shipped service worker navigation behavior', () => {
  it('precaches generated scripts and styles during the first installation', async () => {
    const worker = workerHarness([{ url: 'assets/app-abcd.js' }, { url: 'assets/app-abcd.css' }])
    let completion: Promise<void> | undefined
    worker.listeners.get('install')!({ waitUntil: (value: Promise<void>) => { completion = value } })
    await completion
    const [requests] = worker.cache.addAll.mock.calls[0]
    expect(requests.map((request) => request.url)).toEqual(expect.arrayContaining([worker.origin + '/', worker.origin + '/assets/app-abcd.js', worker.origin + '/assets/app-abcd.css']))
    expect(requests.every((request) => request.cache === 'reload')).toBe(true)
    expect(new Set(requests.map((request) => request.url)).size).toBe(requests.length)
  })

  it.each(['/auth/callback?code=synthetic-secret', '/share/synthetic-capability', '/record/synthetic-patient', '/?code=synthetic-secret'])('never retains navigation metadata for %s', async (path) => {
    const worker = workerHarness()
    worker.entries.set('/', worker.response(worker.origin + '/'))
    const result = await worker.request(path)
    expect(result?.url).toBe(worker.origin + '/')
    expect(worker.fetch).not.toHaveBeenCalled()
    expect(worker.cache.put).not.toHaveBeenCalled()
    expect([...worker.entries.values()].map((entry) => entry.url)).toEqual([worker.origin + '/'])
  })

  it('keeps old and waiting builds on their own shell and lazy assets even when the network has newer HTML', async () => {
    const active = workerHarness()
    const waiting = workerHarness()
    active.entries.set('/', active.response(active.origin + '/', '<script src="/assets/a.js"></script>'))
    active.entries.set(active.origin + '/assets/lazy-a.js', active.response(active.origin + '/assets/lazy-a.js', 'lazy A'))
    waiting.entries.set('/', waiting.response(waiting.origin + '/', '<script src="/assets/b.js"></script>'))
    active.fetch.mockResolvedValue(waiting.response(waiting.origin + '/', '<script src="/assets/b.js"></script>'))
    expect(await (await active.request('/'))?.text()).toContain('/assets/a.js')
    active.fetch.mockRejectedValue(new TypeError('offline'))
    expect(await (await active.request('/demo/dashboard'))?.text()).toContain('/assets/a.js')
    expect(await (await active.request('/assets/lazy-a.js', 'cors'))?.text()).toBe('lazy A')
    expect(await (await waiting.request('/'))?.text()).toContain('/assets/b.js')
  })

  it('falls back to the network without caching navigation when storage is unavailable', async () => {
    const worker = workerHarness()
    worker.caches.open.mockRejectedValue(new Error('storage unavailable'))
    expect((await worker.request('/auth/callback?code=synthetic'))?.status).toBe(200)
    expect(worker.cache.put).not.toHaveBeenCalled()
    worker.fetch.mockRejectedValueOnce(new TypeError('offline'))
    expect((await worker.request('/'))?.status).toBe(503)
  })

  it('does not cache static requests with query data or intercept API requests', () => {
    const worker = workerHarness()
    expect(worker.request('/assets/app.js?code=synthetic', 'cors')).toBeUndefined()
    expect(worker.request('/api/private')).toBeUndefined()
    expect(worker.fetch).not.toHaveBeenCalled()
  })

  it('removes old app caches on activation without deleting unrelated caches', async () => {
    const worker = workerHarness()
    let completion: Promise<void> | undefined
    worker.listeners.get('activate')!({ waitUntil: (value: Promise<void>) => { completion = value } })
    await completion
    expect(worker.caches.delete).toHaveBeenCalledExactlyOnceWith('firefly-pwa-v1-static')
  })
})
