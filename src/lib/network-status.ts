/**
 * [INPUT]: 依赖 react hooks 与浏览器 navigator online/offline 事件。
 * [OUTPUT]: 对外提供 OnlineRequiredError、在线状态 hook、离线检测与中英文在线依赖提示。
 * [POS]: src/lib 的网络状态边界，让 PWA 离线壳只表达真实连接状态，不让认证、OCR、AI、保存、分享或统计读取伪成功。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useEffect, useState } from 'react'

import type { Locale } from '@/lib/locale'

export class OnlineRequiredError extends Error {
  constructor(message = 'Network connection is required for this action.') {
    super(message)
    this.name = 'OnlineRequiredError'
  }
}

export function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function ensureBrowserOnline() {
  if (isBrowserOffline()) {
    throw new OnlineRequiredError()
  }
}

export function isOnlineRequiredError(error: unknown) {
  return error instanceof OnlineRequiredError
}

export function getOnlineRequiredMessage(locale: Locale) {
  return locale === 'zh' ? '当前网络不可用，请联网后重试。' : 'Network unavailable. Reconnect and retry.'
}

export function useBrowserOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => !isBrowserOffline())

  useEffect(() => {
    const update = () => setIsOnline(!isBrowserOffline())

    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return isOnline
}
