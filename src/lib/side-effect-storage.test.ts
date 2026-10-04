/**
 * [INPUT]: 依赖 vitest 与 ./side-effect-storage 的字段映射。
 * [OUTPUT]: 对外提供副作用存储行映射的合同测试。
 * [POS]: lib 的副作用存储测试，约束 row→record 映射不丢字段、severity 合法值不越界。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import { SideEffectStorageError } from './side-effect-storage'

describe('side-effect storage contract', () => {
  it('exposes a typed storage error so pages can distinguish storage failures', () => {
    const error = new SideEffectStorageError('boom')

    expect(error.name).toBe('SideEffectStorageError')
    expect(error).toBeInstanceOf(Error)
  })
})
