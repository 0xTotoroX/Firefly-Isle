/**
 * [INPUT]: 依赖 node:fs 的部署头合同检查。
 * [OUTPUT]: 对外提供 public/_headers 安全响应头的回归测试。
 * [POS]: lib 的安全头合同测试，约束 CSP 只允许自身脚本（内联主题引导按 hash 白名单）、Supabase 网络域、Google Fonts 与头像域，并保持 HSTS 与点击劫持防护存在。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readHeadersSource() {
  return readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8')
}

describe('deployment security headers contract', () => {
  it('keeps clickjacking, sniffing and referrer protections', () => {
    const source = readHeadersSource()

    expect(source).toContain('X-Frame-Options: DENY')
    expect(source).toContain('X-Content-Type-Options: nosniff')
    expect(source).toContain('Referrer-Policy: strict-origin-when-cross-origin')
  })

  it('declares HSTS and a CSP with frame-ancestors none', () => {
    const source = readHeadersSource()

    expect(source).toContain('Strict-Transport-Security: max-age=')
    expect(source).toContain('Content-Security-Policy:')
    expect(source).toContain("frame-ancestors 'none'")
    expect(source).toContain("base-uri 'self'")
    expect(source).toContain("object-src 'none'")
  })

  it('allows scripts only from self plus the inline theme bootstrap hash', () => {
    const source = readHeadersSource()
    const csp = source.match(/Content-Security-Policy: (.*)/)?.[1] ?? ''

    expect(csp).toContain("script-src 'self' 'sha256-")
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
  })

  it('allows only supabase, google fonts and google avatars as external origins', () => {
    const source = readHeadersSource()
    const csp = source.match(/Content-Security-Policy: (.*)/)?.[1] ?? ''
    const allowedOrigins = new Set([
      'https://*.supabase.co',
      'https://*.functions.supabase.co',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://*.googleusercontent.com',
    ])
    const declaredOrigins = csp.match(/https:\/\/[a-z.*.]+/g) ?? []

    expect(declaredOrigins).toContain('https://*.supabase.co')
    expect(declaredOrigins).toContain('https://*.functions.supabase.co')
    expect(csp).toContain('wss://*.supabase.co')
    expect(declaredOrigins.length).toBeGreaterThan(0)
    for (const origin of declaredOrigins) {
      expect(allowedOrigins.has(origin), `unexpected external origin: ${origin}`).toBe(true)
    }
  })
})
