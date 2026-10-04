// @vitest-environment happy-dom
/**
 * [INPUT]: happy-dom、全局错误事件、注入的异步 sender 与 JSON/Sentry 配置。
 * [OUTPUT]: 诊断类别白名单、路由脱敏、传输格式、发送失败隔离和监听清理回归。
 * [POS]: 不发送真实诊断数据；合成病历文本、密钥与授权码必须不出现在任何请求体中。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initErrorReporting, reportError } from './error-reporting'

const endpoints = ['/diagnostics', 'https://report.example.test/collect', 'https://public-key@errors.example.test/123']
let stopReporting: () => void = () => undefined

afterEach(() => {
  stopReporting()
  stopReporting = () => undefined
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

function sentBody(sender: ReturnType<typeof vi.fn>) {
  return String((sender.mock.calls[0] as [string, RequestInit])[1].body)
}

describe('error reporting', () => {
  it('remains a no-op without a configured endpoint', () => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', '')
    const sender = vi.fn()
    reportError(new Error('boom'), sender)
    stopReporting = initErrorReporting(sender)
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom') }))
    expect(sender).not.toHaveBeenCalled()
  })

  it.each(endpoints)('never includes clinical text or credentials in requests to %s', (endpoint) => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', endpoint)
    window.history.replaceState(null, '', '/share/secret-share-code?token=secret-token#secret-hash')
    const sender = vi.fn().mockResolvedValue(new Response())
    const error = new Error('病人张某，肺癌；api_key=secret-api-key')
    error.name = '诊断-secret-error-name'
    error.stack = '张某 at https://example.test/record/patient-id?key=secret-api-key:1:2'
    reportError(error, sender, '患者张某 secret-component-stack')
    const body = sentBody(sender)
    for (const secret of ['张某', '肺癌', 'secret-', 'patient-id', 'api_key', 'stack']) expect(body).not.toContain(secret)
    expect(body).toContain('/share/:code')
    expect(body).toContain('Error')
    expect(sender).toHaveBeenCalledOnce()
    expect(sender.mock.calls[0][1]).toMatchObject({ referrerPolicy: 'no-referrer', credentials: 'omit' })
  })

  it.each([
    ['/record/private-id', '/record/:id'],
    ['/record/private-id/follow-up', '/record/:id/follow-up'],
    ['/record/private-id/side-effects', '/record/:id/side-effects'],
    ['/analytics/private-id', '/analytics/:id'],
    ['/settings', '/settings'],
    ['/private-patient-name/unrecognized', '/unknown'],
  ])('reports only a fixed route for %s', (path, expected) => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', endpoints[0])
    window.history.replaceState(null, '', `${path}?secret=query`)
    const sender = vi.fn().mockResolvedValue(new Response())
    reportError(new TypeError('private text'), sender)
    const payload = JSON.parse(sentBody(sender))
    expect(payload.location).toBe(expected)
    expect(payload.message).toBe('TypeError')
    expect(sentBody(sender)).not.toContain('private')
    expect(sentBody(sender)).not.toContain('secret')
  })

  it('does not stringify arbitrary rejection values or read error messages and stacks', () => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', endpoints[0])
    const sender = vi.fn().mockResolvedValue(new Response())
    const stringify = vi.fn(() => { throw new Error('must not inspect clinical payload') })
    reportError({ toString: stringify, patient: 'private-patient' }, sender)
    const error = new Error()
    Object.defineProperties(error, {
      message: { get: () => { throw new Error('must not read message') } },
      stack: { get: () => { throw new Error('must not read stack') } },
    })
    expect(() => reportError(error, sender)).not.toThrow()
    expect(stringify).not.toHaveBeenCalled()
    expect(sender).toHaveBeenCalledTimes(2)
  })

  it('uses a valid Sentry event envelope with its UTF-8 byte length', () => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', endpoints[2])
    const sender = vi.fn().mockResolvedValue(new Response())
    reportError(new RangeError('private'), sender)
    const [header, item, eventJson] = sentBody(sender).split('\n')
    const event = JSON.parse(eventJson)
    expect(JSON.parse(item)).toEqual({ type: 'event', length: new TextEncoder().encode(eventJson).byteLength })
    expect(event.event_id).toBe(JSON.parse(header).event_id)
    expect(event.exception.values).toEqual([{ type: 'RangeError', value: 'RangeError' }])
    expect(sender.mock.calls[0][0]).toBe('https://errors.example.test/api/123/envelope/?sentry_key=public-key')
  })

  it.each(endpoints)('contains synchronous sender failures for %s', (endpoint) => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', endpoint)
    const sender = vi.fn(() => { throw new Error('collector unavailable') })
    expect(() => reportError(new Error('private'), sender)).not.toThrow()
    expect(sender).toHaveBeenCalledOnce()
  })

  it.each(endpoints)('consumes rejected sends without triggering another report for %s', async (endpoint) => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', endpoint)
    const sender = vi.fn().mockRejectedValue(new Error('collector unavailable'))
    stopReporting = initErrorReporting(sender)
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('private') }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sender).toHaveBeenCalledOnce()
  })

  it('distinguishes rejection events and removes both global listeners', () => {
    vi.stubEnv('VITE_ERROR_REPORT_URL', endpoints[0])
    const sender = vi.fn().mockResolvedValue(new Response())
    stopReporting = initErrorReporting(sender)
    const rejection = new Event('unhandledrejection')
    Object.defineProperty(rejection, 'reason', { value: new SyntaxError('private input') })
    window.dispatchEvent(rejection)
    expect(JSON.parse(sentBody(sender))).toMatchObject({ type: 'unhandledrejection', message: 'SyntaxError' })
    stopReporting()
    window.dispatchEvent(rejection)
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('private') }))
    expect(sender).toHaveBeenCalledOnce()
  })
})
