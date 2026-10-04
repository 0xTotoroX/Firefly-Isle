/**
 * [INPUT]: 依赖 vitest 与 ./network-status。
 * [OUTPUT]: 对外提供 PWA 离线检测和在线依赖错误文案合同测试。
 * [POS]: src/lib 的网络状态测试，约束离线时关键在线动作可提前失败。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { afterEach, describe, expect, it } from 'vitest'

import {
  ensureBrowserOnline,
  getOnlineRequiredMessage,
  isBrowserOffline,
  isOnlineRequiredError,
  OnlineRequiredError,
} from './network-status'

const originalNavigator = globalThis.navigator

function setNavigatorOnlineState(onLine: boolean) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine },
  })
}

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  })
})

describe('network status helpers', () => {
  it('detects explicit browser offline state', () => {
    setNavigatorOnlineState(false)

    expect(isBrowserOffline()).toBe(true)
    expect(() => ensureBrowserOnline()).toThrow(OnlineRequiredError)
  })

  it('treats normal online state as available', () => {
    setNavigatorOnlineState(true)

    expect(isBrowserOffline()).toBe(false)
    expect(() => ensureBrowserOnline()).not.toThrow()
  })

  it('provides localized online-required feedback', () => {
    const error = new OnlineRequiredError()

    expect(isOnlineRequiredError(error)).toBe(true)
    expect(getOnlineRequiredMessage('zh')).toContain('联网')
    expect(getOnlineRequiredMessage('en')).toContain('Reconnect')
  })
})
