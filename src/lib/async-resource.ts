/**
 * [INPUT]: 依赖 react 的 useEffect/useState 与调用方注入的 loader。
 * [OUTPUT]: 对外提供 useAsyncResource 与 AsyncResource 类型。
 * [POS]: lib 的共享异步数据加载基元，统一「data/error/isLoading + 竞态守卫 + reload」样板，替代页面层手写的 active 守卫 effect；deps 变化时重置回 initialData/加载态，loader 通过 effect 内联调用，由 deps 驱动重载。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useEffect, useState } from 'react'

export type AsyncResource<T> = {
  data: T | null
  error: unknown
  isLoading: boolean
  reload: () => void
}

export function useAsyncResource<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
  initialData: T | null = null,
): AsyncResource<T> {
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<{ data: T | null; error: unknown; isLoading: boolean }>(() => ({
    data: initialData,
    error: null,
    isLoading: initialData === null,
  }))

  useEffect(() => {
    let active = true

    setState({ data: initialData, error: null, isLoading: initialData === null })

    void loader()
      .then((data) => {
        if (active) {
          setState({ data, error: null, isLoading: false })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ data: null, error, isLoading: false })
        }
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loader 与 initialData 由调用方每次渲染重建，deps 才是真实的重载依据
  }, [...deps, nonce])

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    reload: () => {
      setNonce((current) => current + 1)
    },
  }
}
