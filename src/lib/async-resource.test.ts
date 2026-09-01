/**
 * [INPUT]: 依赖 node:fs 的源码合同检查。
 * [OUTPUT]: 对外提供 useAsyncResource 竞态守卫与重载语义的结构回归测试。
 * [POS]: lib 的异步资源基元合同测试，约束 effect 携带 active 守卫与清理、deps 变化时重置 loading、reload 通过 nonce 触发。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readHookSource() {
  return readFileSync(new URL('./async-resource.ts', import.meta.url), 'utf8')
}

describe('useAsyncResource contract', () => {
  it('guards against stale async settle after deps change or unmount', () => {
    const source = readHookSource()

    expect(source).toContain('let active = true')
    expect(source).toContain('active = false')
    expect(source.indexOf('let active = true')).toBeLessThan(source.indexOf('active = false'))
  })

  it('starts loading, exposes data or error exclusively, and offers reload', () => {
    const source = readHookSource()

    expect(source).toContain('isLoading: initialData === null')
    expect(source).toContain('data: null, error, isLoading: false')
    expect(source).toContain('data, error: null, isLoading: false')
    expect(source).toContain('setNonce((current) => current + 1)')
  })
})
