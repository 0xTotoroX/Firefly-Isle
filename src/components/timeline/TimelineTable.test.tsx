/**
 * [INPUT]: 依赖 node:fs 的源码合同检查、react-dom/server 的静态渲染、LocaleProvider 与 ./TimelineTable 的 blur 取消提交 helpers。
 * [OUTPUT]: 对外提供 TimelineTable Escape 取消不提交行为、主题 class 分支去噪与患者类型标签不外露的回归测试。
 * [POS]: components/timeline 的主表格测试，约束输入框取消语义、CSS 变量驱动的主题边界与正式时间线头部信息边界，和 TimelineTable.tsx 同步演化。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LocaleProvider } from '@/lib/locale'
import type { PatientRecord } from '@/types/patient'

import { consumeCanceledBlur, markNextBlurAsCanceled } from './TimelineTable'
import { TimelineTable } from './TimelineTable'

function readTimelineTableSource() {
  return readFileSync(new URL('./TimelineTable.tsx', import.meta.url), 'utf8')
}

describe('TimelineTable inline editing contract', () => {
  it('consumes exactly one blur commit after Escape cancels editing', () => {
    const guard = { current: false }

    expect(consumeCanceledBlur(guard)).toBe(false)

    markNextBlurAsCanceled(guard)

    expect(consumeCanceledBlur(guard)).toBe(true)
    expect(guard.current).toBe(false)
    expect(consumeCanceledBlur(guard)).toBe(false)
  })

  it('keeps identical dark/light class branches out of CSS-variable helpers', () => {
    const source = readTimelineTableSource()

    expect(source).toContain('function getShellClass() {')
    expect(source).toContain('function getSectionClass() {')
    expect(source).toContain('function getCellClass(critical: boolean, filled: boolean) {')
    expect(source).not.toContain("return theme === 'dark'\n    ? 'rounded-[var(--ff-radius-md)] border")
  })

  it('does not expose advanced or non-advanced patient category labels in the table header', () => {
    const record: PatientRecord = {
      basicInfo: { stage: 'IV期', tumorType: '肺癌' },
      treatmentLines: [{ lineNumber: 1, regimen: '奥希替尼' }],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <TimelineTable record={record} theme="light" />
      </LocaleProvider>,
    )

    expect(markup).not.toContain('患者类型')
    expect(markup).not.toContain('初诊晚期')
    expect(markup).not.toContain('复发晚期')
    expect(markup).not.toContain('非晚期')
    expect(markup).not.toContain('Archetype')
    expect(markup).not.toContain('De Novo Advanced')
    expect(markup).not.toContain('Relapsed Advanced')
    expect(markup).not.toContain('Non-Advanced')
  })
})
