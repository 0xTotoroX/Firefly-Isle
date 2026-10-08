/**
 * [INPUT]: 依赖 node:fs、public/_headers 与 edgeone.json 的两平台部署头。
 * [OUTPUT]: 对外提供腾讯云与 Cloudflare 安全响应头的回归测试。
 * [POS]: lib 的安全头合同测试，约束 CSP 只允许自身脚本（内联主题引导按 hash 白名单）、Supabase 网络域、自托管字体与 Google 头像域，并保持 HSTS 与点击劫持防护存在。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readHeadersSource(platform: string) {
  if (platform === 'Cloudflare') return readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8')
  const config = JSON.parse(readFileSync(new URL('../../edgeone.json', import.meta.url), 'utf8')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
  }
  return config.headers.find((group) => group.source === '/*')!.headers.map(({ key, value }) => `${key}: ${value}`).join('\n')
}

describe.each(['Cloudflare', 'Tencent'])('%s deployment security headers contract', (platform) => {
  it('keeps clickjacking, sniffing and referrer protections', () => {
    const source = readHeadersSource(platform)

    expect(source).toContain('X-Frame-Options: DENY')
    expect(source).toContain('X-Content-Type-Options: nosniff')
    expect(source).toContain('Referrer-Policy: strict-origin-when-cross-origin')
  })

  it('declares HSTS and a CSP with frame-ancestors none', () => {
    const source = readHeadersSource(platform)

    expect(source).toContain('Strict-Transport-Security: max-age=')
    expect(source).toContain('Content-Security-Policy:')
    expect(source).toContain("frame-ancestors 'none'")
    expect(source).toContain("base-uri 'self'")
    expect(source).toContain("object-src 'none'")
  })

  it('allows scripts only from self plus the inline theme bootstrap hash', () => {
    const source = readHeadersSource(platform)
    const csp = source.match(/Content-Security-Policy: (.*)/)?.[1] ?? ''

    expect(csp).toContain("script-src 'self' 'sha256-")
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
  })

  it('allows only supabase and google avatars as external origins', () => {
    const source = readHeadersSource(platform)
    const csp = source.match(/Content-Security-Policy: (.*)/)?.[1] ?? ''
    const allowedOrigins = new Set([
      'https://api.myoncode.com',
      'https://supabase.ghibli1024.com',
      'https://*.supabase.co',
      'https://*.functions.supabase.co',
      'wss://*.supabase.co',
      'https://*.googleusercontent.com',
    ])
    const declaredOrigins = csp.split(/[\s;]+/).filter((token) => token.includes('://'))

    expect(declaredOrigins).toContain('https://*.supabase.co')
    expect(declaredOrigins).toContain('https://*.functions.supabase.co')
    expect(declaredOrigins).toContain('https://supabase.ghibli1024.com')
    expect(declaredOrigins).toContain('https://api.myoncode.com')
    expect(csp).toContain('wss://*.supabase.co')
    expect(declaredOrigins.length).toBeGreaterThan(0)
    for (const origin of declaredOrigins) {
      expect(allowedOrigins.has(origin), `unexpected external origin: ${origin}`).toBe(true)
    }
  })
})
