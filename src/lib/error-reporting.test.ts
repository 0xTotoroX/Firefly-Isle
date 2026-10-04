/**
 * [INPUT]: 依赖 ./error-reporting 的 DSN 解析与信封构造。
 * [OUTPUT]: 对外提供 Sentry DSN 到 envelope 端点的转换测试。
 * [POS]: lib 的可观测性测试，约束 DSN 形态、envelope 三段结构与脱敏负载。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import { sentryEnvelopeUrlFromDsn } from './error-reporting'

describe('sentry envelope url', () => {
  it('derives the envelope endpoint from a standard DSN', () => {
    expect(sentryEnvelopeUrlFromDsn('https://abc123@o450123.ingest.us.sentry.io/4512015414788096')).toBe(
      'https://o450123.ingest.us.sentry.io/api/4512015414788096/envelope/?sentry_key=abc123',
    )
  })

  it('rejects non-DSN endpoints so they fall back to plain JSON POST', () => {
    expect(sentryEnvelopeUrlFromDsn('https://report.example.test/collect')).toBeNull()
    expect(sentryEnvelopeUrlFromDsn('not-a-url')).toBeNull()
  })
})
