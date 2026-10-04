/**
 * [INPUT]: 依赖 node:fs 的源码合同检查，依赖 ./auth 的 AuthProvider 实现。
 * [OUTPUT]: 对外提供 Supabase session 恢复、认证广播、订阅清理与 signOut 边界的回归测试。
 * [POS]: lib 的认证基础设施测试文件，约束 AuthProvider 继续以 Supabase 为单一会话真相源，不在页面层复制 session 状态机。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readAuthSource() {
  return readFileSync(new URL('./auth.tsx', import.meta.url), 'utf8')
}

describe('AuthProvider Supabase session contract', () => {
  it('initializes callback handling and restores the existing Supabase session before marking auth ready', () => {
    const source = readAuthSource()

    expect(source).toContain('.initialize()')
    expect(source).toContain('.getSession()')
    expect(source.indexOf('.initialize()')).toBeLessThan(source.indexOf('.getSession()'))
    expect(source).toContain('setSession(data.session ?? null)')
    expect(source).toContain('setIsAuthReady(true)')
  })

  it('subscribes to auth state changes and cleans up the subscription', () => {
    const source = readAuthSource()

    expect(source).toContain('.onAuthStateChange')
    expect(source).toContain('setSession(nextSession ?? null)')
    expect(source).toContain('subscription.unsubscribe()')
  })

  it('exposes signOut through the provider instead of duplicating it in route code', () => {
    const source = readAuthSource()

    expect(source).toContain('const signOut = useCallback(async () => {')
    expect(source).toContain('.signOut()')
    expect(source).toContain('signOut,')
  })
})
