/**
 * [INPUT]: 依赖 react 的 useEffect/useState 与调用方注入的 loader。
 * [OUTPUT]: 对外提供 useAsyncResource 与 AsyncResource 类型。
 * [POS]: 共享异步资源；输入/重载变化时在渲染阶段条件重置，effect 仅启动外部请求并隔离迟到结果。
 * [PROTOCOL]: 契约变化时同步 AGENTS.md。
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
  const inputs = [...deps, nonce]
  const [previousInputs, setPreviousInputs] = useState(inputs)

  if (inputs.length !== previousInputs.length || inputs.some((input, index) => !Object.is(input, previousInputs[index]))) {
    setPreviousInputs(inputs)
    setState({ data: initialData, error: null, isLoading: initialData === null })
  }

  useEffect(() => {
    let active = true

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
