/**
 * [INPUT]: 依赖 node:fs、node:path、vitest、public manifest/sw/header/redirect 文件与 ./pwa。
 * [OUTPUT]: 对外提供 PWA 安装元数据、service worker 注册条件与隐私缓存边界合同测试。
 * [POS]: src/lib 的 PWA 合同测试，确保 manifest 可安装、生产安全上下文才注册 SW、动态医疗 API 不进入 Cache Storage。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

    expect(manifest.name).toContain('Firefly Isle')
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
    expect(serviceWorkerSource).toContain('cache.put(APP_SHELL_URL')
    expect(serviceWorkerSource).not.toContain('record_shares')
    expect(serviceWorkerSource).not.toContain('patients')
    expect(serviceWorkerSource).not.toContain('lab_results')
  })
})
