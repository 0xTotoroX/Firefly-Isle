/**
 * [INPUT]: 依赖 window 的 error/unhandledrejection 事件、import.meta.env 的 VITE_ERROR_REPORT_URL 与注入的 sender。
 * [OUTPUT]: 对外提供 initErrorReporting 与 reportError。
 * [POS]: lib 的可观测性边界，env 门控的通用错误上报（不绑定厂商）；未配置上报地址时全部为 no-op，负载只含定位所需的脱敏字段。
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

function getReportUrl() {
  return import.meta.env.VITE_ERROR_REPORT_URL?.trim() ?? ''
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

export function reportError(error: unknown, sender: typeof fetch = fetch, componentStack?: string) {
  const url = getReportUrl()

  if (!url || typeof window === 'undefined') {
    return
  }

  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  try {
    void sender(url, {
      body: JSON.stringify(buildPayload('error', message, stack, undefined, componentStack)),
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
