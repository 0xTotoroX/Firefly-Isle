/**
 * [INPUT]: window 错误事件、VITE_ERROR_REPORT_URL 与注入的 sender。
 * [OUTPUT]: initErrorReporting、reportError 与 sentryEnvelopeUrlFromDsn。
 * [POS]: 错误报告只含已知类别、固定路由、来源与时间；不采集任意正文、堆栈或身份。支持 JSON/Sentry，发送失败不再上报。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
type ErrorReportPayload = {
  location: string
  message: string
  source: 'window' | 'react'
  timestamp: string
  type: 'error' | 'unhandledrejection'
}

const SENTRY_DSN_PATTERN = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/
const ERROR_CLASSES = new Set([
  'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError',
  'AbortError', 'NetworkError', 'QuotaExceededError', 'SecurityError',
  'ProfileSettingsError', 'ClinicalAnalysisParseError', 'SideEffectStorageError', 'ChatError',
  'MedicalDocumentOcrError', 'OnlineRequiredError', 'RecordEditParseError', 'RecordSharePermissionError',
  'ExtractionParseError', 'FollowUpStorageError',
])
const STATIC_ROUTES = new Set([
  '/', '/login', '/auth/callback', '/auth/reset-password', '/privacy', '/demo', '/demo/record', '/demo/analytics',
  '/models', '/dashboard', '/app', '/analytics', '/donate', '/settings',
])

export function sentryEnvelopeUrlFromDsn(dsn: string) {
  const match = SENTRY_DSN_PATTERN.exec(dsn.trim())
  if (!match) return null
  const [, publicKey, host, projectId] = match
  return `https://${host}/api/${projectId}/envelope/?sentry_key=${publicKey}`
}

function getReportUrl() {
  return import.meta.env.VITE_ERROR_REPORT_URL?.trim() ?? ''
}

function routeTemplate() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
  if (STATIC_ROUTES.has(pathname)) return pathname
  if (/^\/share\/[^/]+$/.test(pathname)) return '/share/:code'
  if (/^\/analytics\/[^/]+$/.test(pathname)) return '/analytics/:id'
  if (/^\/record\/[^/]+$/.test(pathname)) return '/record/:id'
  if (/^\/record\/[^/]+\/follow-up$/.test(pathname)) return '/record/:id/follow-up'
  if (/^\/record\/[^/]+\/side-effects$/.test(pathname)) return '/record/:id/side-effects'
  return '/unknown'
}

function errorClass(error: unknown) {
  const isError = error instanceof Error || (typeof DOMException !== 'undefined' && error instanceof DOMException)
  return isError && ERROR_CLASSES.has(error.name) ? error.name : 'Error'
}

function buildSentryEnvelope(payload: ErrorReportPayload) {
  const eventId = crypto.randomUUID().replace(/-/g, '')
  const header = JSON.stringify({
    event_id: eventId,
    sdk: { name: 'firefly-isle.web', version: '1.5.0' },
    sent_at: payload.timestamp,
  })
  const eventJson = JSON.stringify({
    event_id: eventId,
    environment: import.meta.env.MODE === 'development' ? 'development' : 'production',
    exception: { values: [{ type: payload.message, value: payload.message }] },
    level: 'error',
    logger: 'javascript',
    platform: 'javascript',
    request: { url: payload.location },
    tags: { source: payload.source, error_event: payload.type },
    timestamp: new Date(payload.timestamp).getTime() / 1000,
  })
  const item = JSON.stringify({ length: new TextEncoder().encode(eventJson).byteLength, type: 'event' })
  return `${header}\n${item}\n${eventJson}\n`
}

function sendReport(type: ErrorReportPayload['type'], error: unknown, sender: typeof fetch, source: ErrorReportPayload['source'] = 'window') {
  const reportUrl = getReportUrl()
  if (!reportUrl || typeof window === 'undefined' || /^\/demo(?:\/|$)/.test(window.location.pathname)) return

  try {
    const payload: ErrorReportPayload = {
      location: routeTemplate(),
      message: errorClass(error),
      source,
      timestamp: new Date().toISOString(),
      type,
    }
    const envelopeEndpoint = sentryEnvelopeUrlFromDsn(reportUrl)
    void Promise.resolve(sender(envelopeEndpoint ?? reportUrl, {
      body: envelopeEndpoint ? buildSentryEnvelope(payload) : JSON.stringify(payload),
      headers: { 'Content-Type': envelopeEndpoint ? 'application/x-sentry-envelope' : 'application/json' },
      keepalive: true,
      method: 'POST',
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
    })).catch(() => undefined)
  } catch {
    // 包括同步 sender 失败；诊断路径自身不能制造新的全局错误。
  }
}

export function reportError(error: unknown, sender: typeof fetch = fetch, componentStack?: string) {
  // Retain the ErrorBoundary call shape without sending its raw component stack.
  sendReport('error', error, sender, componentStack === undefined ? 'window' : 'react')
}

export function initErrorReporting(sender: typeof fetch = fetch) {
  if (typeof window === 'undefined' || !getReportUrl()) return () => undefined
  const handleErrorEvent = (event: ErrorEvent) => sendReport('error', event.error, sender)
  const handleRejectionEvent = (event: PromiseRejectionEvent) => sendReport('unhandledrejection', event.reason, sender)
  window.addEventListener('error', handleErrorEvent)
  window.addEventListener('unhandledrejection', handleRejectionEvent)
  return () => {
    window.removeEventListener('error', handleErrorEvent)
    window.removeEventListener('unhandledrejection', handleRejectionEvent)
  }
}
