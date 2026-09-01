// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、vitest、import.meta.env 的 VITE_ERROR_REPORT_URL 模拟与 ./error-reporting。
 * [OUTPUT]: 对外提供错误上报开关与脱敏负载的回归测试。
 * [POS]: lib 的可观测性测试，约束未配置地址时 no-op、配置后上报脱敏字段（只含 pathname）、上报失败不影响调用方。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { initErrorReporting, reportError } from './error-reporting'

describe('error reporting', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('stays a no-op without a configured report url', () => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', '')
    const sender = vi.fn()

    reportError(new Error('boom'), sender as unknown as typeof fetch)
    const stop = initErrorReporting(sender as unknown as typeof fetch)

    window.dispatchEvent(new ErrorEvent('error', { message: 'x', error: new Error('x') }))

    expect(sender).not.toHaveBeenCalled()
    expect(stop()).toBeUndefined()
  })

  it('reports errors with sanitized payloads when configured', async () => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', 'https://report.example.test/collect')
    window.history.replaceState(null, '', '/share/secret-code?token=abc')
    const sender = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))

    reportError(new Error('boom'), sender as unknown as typeof fetch)

    await vi.waitFor(() => {
      expect(sender).toHaveBeenCalledTimes(1)
    })

    const [url, init] = sender.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>

    expect(url).toBe('https://report.example.test/collect')
    expect(init.method).toBe('POST')
    expect(payload.message).toBe('boom')
    expect(payload.location).toBe('/share/secret-code')
    expect(String(payload.location)).not.toContain('token=abc')
  })

  it('installs global listeners and reports unhandled rejections', async () => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', 'https://report.example.test/collect')
    const sender = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))

    initErrorReporting(sender as unknown as typeof fetch)

    window.dispatchEvent(new Event('unhandledrejection'))

    await vi.waitFor(() => {
      expect(sender).toHaveBeenCalledTimes(1)
    })

    const [, init] = sender.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>

    expect(payload.message).toBe('Unhandled promise rejection')
  })
})
