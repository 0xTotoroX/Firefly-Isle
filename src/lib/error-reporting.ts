/**
 * [INPUT]: 依赖 window 的 error/unhandledrejection 事件、import.meta.env 的 VITE_ERROR_REPORT_URL 与注入的 sender。
 * [OUTPUT]: 对外提供 initErrorReporting、reportError 与 sentryEnvelopeUrlFromDsn。
 * [POS]: lib 的可观测性边界，env 门控的错误上报。VITE_ERROR_REPORT_URL 接受 Sentry DSN（自动转 envelope 协议）或任意 JSON POST 端点；未配置时全部为 no-op，负载只含定位所需的脱敏字段。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

type ErrorReportPayload = {
  componentStack?: string
  location: string
  message: string
  source?: string
  stack?: string
  timestamp: string
  type: 'error' | 'unhandledrejection'
}

type SentryExceptionEvent = {
  environment: string
  exception: {
    values: Array<{
      stacktrace?: { frames: Array<{ filename: string; function?: string; in_app: boolean; lineno?: number; type: string }> }
      type: string
      value: string
    }>
  }
  level: 'error'
  logger: 'javascript'
  platform: 'javascript'
  request: { url: string }
  timestamp: number
}

const SENTRY_DSN_PATTERN = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/

export function sentryEnvelopeUrlFromDsn(dsn: string) {
  const match = SENTRY_DSN_PATTERN.exec(dsn.trim())

  if (!match) {
    return null
  }

  const [, publicKey, host, projectId] = match

  return `https://${host}/api/${projectId}/envelope/?sentry_key=${publicKey}`
}

function getReportUrl() {
  return import.meta.env.VITE_ERROR_REPORT_URL?.trim() ?? ''
}

function currentEnvironment() {
  return import.meta.env.MODE === 'development' ? 'development' : 'production'
}

function buildPayload(
  type: ErrorReportPayload['type'],
  message: string,
  stack?: string,
  source?: string,
  componentStack?: string,
): ErrorReportPayload {
  return {
    // 只上报路径，不上报查询串，避免把授权码/分享码等敏感参数带出浏览器。
    location: typeof window === 'undefined' ? '' : window.location.pathname,
    message: message.slice(0, 512),
    source,
    stack: stack?.slice(0, 2048),
    ...(componentStack ? { componentStack: componentStack.slice(0, 2048) } : {}),
    timestamp: new Date().toISOString(),
    type,
  }
}

function buildSentryEvent(payload: ErrorReportPayload, error: unknown) {
  const frames = payload.stack
    ?.split('\n')
    .filter((line) => line.includes('://') || line.includes('@'))
    .slice(-8)
    .map((line) => ({
      filename: line.replace(/^.*?(https?:\/\/[^ )]+|\/[^ )]+).*$/, '$1').slice(0, 200),
      in_app: true,
      lineno: Number.parseInt(/:(\d+):\d+\)?\s*$/.exec(line)?.[1] ?? '', 10) || undefined,
      type: 'parse',
    }))

  const event: SentryExceptionEvent = {
    environment: currentEnvironment(),
    exception: {
      values: [
        {
          ...(frames && frames.length > 0 ? { stacktrace: { frames: frames.filter((frame) => frame.filename) } } : {}),
          type: error instanceof Error ? error.name : 'Error',
          value: payload.message,
        },
      ],
    },
    level: 'error',
    logger: 'javascript',
    platform: 'javascript',
    request: { url: payload.location },
    timestamp: Math.floor(new Date(payload.timestamp).getTime() / 1000),
  }

  return event
}

function buildSentryEnvelope(url: string, payload: ErrorReportPayload, error: unknown) {
  const eventId = crypto.randomUUID().replace(/-/g, '')
  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sdk: { name: 'firefly-isle.web', version: '1.5.0' },
    sent_at: payload.timestamp,
  })
  const event = buildSentryEvent(payload, error)
  const eventJson = JSON.stringify(event)
  const itemHeader = JSON.stringify({ length: eventJson.length, type: 'exception' })

  return {
    body: `${envelopeHeader}\n${itemHeader}\n${eventJson}`,
    url,
  }
}

export function reportError(error: unknown, sender: typeof fetch = fetch, componentStack?: string) {
  const reportUrl = getReportUrl()

  if (!reportUrl || typeof window === 'undefined') {
    return
  }

  const payload = buildPayload('error', error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : undefined, undefined, componentStack)

  try {
    const envelopeEndpoint = sentryEnvelopeUrlFromDsn(reportUrl)

    if (envelopeEndpoint) {
      const envelope = buildSentryEnvelope(envelopeEndpoint, payload, error)

      void sender(envelope.url, {
        body: envelope.body,
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
        keepalive: true,
        method: 'POST',
      })
      return
    }

    void sender(reportUrl, {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
    })
  } catch {
    // 上报本身永远不影响产品行为。
  }
}

export function initErrorReporting(sender: typeof fetch = fetch) {
  if (typeof window === 'undefined' || !getReportUrl()) {
    return () => undefined
  }

  const handleErrorEvent = (event: ErrorEvent) => {
    reportError(event.error ?? new Error(event.message), sender)
  }

  const handleRejectionEvent = (event: PromiseRejectionEvent) => {
    reportError(event.reason ?? new Error('Unhandled promise rejection'), sender)
  }

  window.addEventListener('error', handleErrorEvent)
  window.addEventListener('unhandledrejection', handleRejectionEvent)

  return () => {
    window.removeEventListener('error', handleErrorEvent)
    window.removeEventListener('unhandledrejection', handleRejectionEvent)
  }
}
