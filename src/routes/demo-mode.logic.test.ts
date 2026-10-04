/**
 * [INPUT]: loadDemoPatientRecord 与本地虚构 fixture。
 * [OUTPUT]: 每次读取返回独立虚构记录副本的回归。
 * [POS]: 兼容 Demo 读取入口测试，不解析真实分享码。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'
import { loadDemoPatientRecord } from './demo-mode.logic'

describe('public demo source', () => {
  it('always returns an independent fictional fixture', async () => {
    const first = await loadDemoPatientRecord()
    first.record.basicInfo!.name = 'Edited'
    const next = await loadDemoPatientRecord()
    expect(next.source).toBe('fixture')
    expect(next.record.basicInfo?.name).toBe('示例患者丙')
    expect(next.record.id).toBe('demo-relapsed')
  })
})
