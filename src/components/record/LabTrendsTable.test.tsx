/**
 * [INPUT]: 依赖 react-dom/server 的静态渲染、vitest 断言、PatientRecord 与 ./LabTrendsTable。
 * [OUTPUT]: 对外提供实验室趋势表渲染、空态与持续异常高亮回归测试。
 * [POS]: components/record 的展示测试，约束 /record/:id lab trends 呈现为辅助趋势信息而非诊断输出。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PatientRecord } from '@/types/patient'

import { LabTrendsTable } from './LabTrendsTable'

function renderLabTrends(record: PatientRecord) {
  return renderToStaticMarkup(<LabTrendsTable locale="zh" record={record} />)
}

describe('LabTrendsTable', () => {
  it('renders grouped lab trends and persistent elevation', () => {
    const markup = renderLabTrends({
      labResults: [
        { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2024-01-01', value: 8.1, unit: 'ng/mL' },
        { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2024-02-01', value: 9.3, unit: 'ng/mL' },
      ],
      treatmentLines: [],
    })

    expect(markup).toContain('实验室趋势')
    expect(markup).toContain('CEA')
    expect(markup).toContain('2024-02-01')
    expect(markup).toContain('持续增高')
    expect(markup).not.toMatch(/诊断|治疗指令/)
  })

  it('renders a quiet empty state when no lab readings exist', () => {
    const markup = renderLabTrends({ treatmentLines: [] })

    expect(markup).toContain('暂无实验室趋势')
    expect(markup).not.toContain('持续增高')
  })
})
