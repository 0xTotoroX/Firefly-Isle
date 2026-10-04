/**
 * [INPUT]: 依赖 react-dom/server 的静态渲染、LocaleProvider 与 ./TimelineTable 的 blur 取消提交 helpers。
 * [OUTPUT]: 对外提供 TimelineTable Escape 取消不提交行为、主题变量、长内容与治疗顺序与患者类型标签不外露的回归测试。
 * [POS]: components/timeline 的主表格测试，约束输入框取消语义、CSS 变量驱动的主题边界与正式时间线头部信息边界，和 TimelineTable.tsx 同步演化。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LocaleProvider } from '@/lib/locale'
import type { PatientRecord } from '@/types/patient'

import { consumeCanceledBlur, markNextBlurAsCanceled } from './TimelineTable'
import { TimelineTable } from './TimelineTable'

describe('TimelineTable inline editing contract', () => {
  it('consumes exactly one blur commit after Escape cancels editing', () => {
    const guard = { current: false }

    expect(consumeCanceledBlur(guard)).toBe(false)

    markNextBlurAsCanceled(guard)

    expect(consumeCanceledBlur(guard)).toBe(true)
    expect(guard.current).toBe(false)
    expect(consumeCanceledBlur(guard)).toBe(false)
  })

  it('keeps long clinical text intact and orders treatment lines without decorative metadata', () => {
    const longGeneticResult = `示例基因检测：${'EGFR_EXON19_'.repeat(30)}\n完整报告备注`;
    const markup = renderToStaticMarkup(
      <LocaleProvider persist={false}>
        <TimelineTable record={{
          initialOnset: { treatment: '示例初次治疗', immunohistochemistry: '初次免疫组化结果' },
          treatmentLines: [
            { lineNumber: 2, regimen: '示例后续方案', geneticTest: longGeneticResult },
            { lineNumber: 1, regimen: '示例首线方案' },
          ],
        }} theme="light" />
      </LocaleProvider>,
    )

    expect(markup).toContain(longGeneticResult)
    expect(markup.indexOf('示例初次治疗')).toBeLessThan(markup.indexOf('示例首线方案'))
    expect(markup.indexOf('示例首线方案')).toBeLessThan(markup.indexOf('示例后续方案'))
    expect(markup).toContain('初次免疫组化结果')
    expect(markup).toContain('[overflow-wrap:anywhere]')
    expect(markup).toContain('whitespace-pre-wrap')
    expect(markup).toContain('var(--ff-timeline-text-body)')
    expect(markup).not.toContain('INITIAL_ONSET')
    expect(markup).not.toContain('LINE_01')
    expect(markup).not.toMatch(/text-\[(?:9|10|11)px\]|truncate|line-clamp/)
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
