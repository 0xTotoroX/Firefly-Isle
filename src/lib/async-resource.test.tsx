// @vitest-environment happy-dom
/**
 * [INPUT]: React 生命周期、延迟请求、共享 useAsyncResource。
 * [OUTPUT]: 验证输入切换、重载、失败恢复和卸载时的迟到结果隔离。
 * [POS]: 异步资源行为回归；使用真实 hook，不锁定内部实现字符串。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAsyncResource } from './async-resource'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('useAsyncResource', () => {
  it('resets loaded data immediately when inputs change and rejects an older response', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const loader = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result, rerender } = renderHook(({ id }) => useAsyncResource(() => loader(id), [id]), { initialProps: { id: 'first' } })
    expect(result.current.isLoading).toBe(true)
    rerender({ id: 'second' })
    await act(async () => { first.resolve('stale') })
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(true)
    await act(async () => { second.resolve('current') })
    expect(result.current.data).toBe('current')
    expect(result.current.isLoading).toBe(false)
  })

  it('clears a previously loaded result on reload and recovers from a failure', async () => {
    const reload = deferred<string>()
    const loader = vi.fn().mockResolvedValueOnce('saved').mockReturnValueOnce(reload.promise).mockResolvedValueOnce('recovered')
    const { result } = renderHook(() => useAsyncResource(loader, []))
    await waitFor(() => expect(result.current.data).toBe('saved'))
    act(() => { result.current.reload() })
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(true)
    const error = new Error('offline')
    await act(async () => { reload.reject(error) })
    expect(result.current.error).toBe(error)
    expect(result.current.isLoading).toBe(false)
    act(() => { result.current.reload() })
    await waitFor(() => expect(result.current.data).toBe('recovered'))
    expect(result.current.error).toBeNull()
  })

  it('keeps the initial fallback while loading and does not reload for equal inputs', async () => {
    const request = deferred<string>()
    const loader = vi.fn().mockReturnValue(request.promise)
    const { result, rerender, unmount } = renderHook(() => useAsyncResource(loader, ['same'], 'fallback'))
    expect(result.current.data).toBe('fallback')
    expect(result.current.isLoading).toBe(false)
    rerender()
    expect(loader).toHaveBeenCalledTimes(1)
    unmount()
    await act(async () => { request.resolve('late') })
    expect(result.current.data).toBe('fallback')
  })
})
