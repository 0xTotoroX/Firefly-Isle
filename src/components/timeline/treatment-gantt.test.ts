/**
 * [INPUT]: 依赖 vitest 的 describe/it/expect，依赖 PatientRecord 与 ./treatment-gantt 的 buildTreatmentGanttProjection。
 * [OUTPUT]: 对外提供治疗方案甘特数据归一化回归测试。
 * [POS]: components/timeline 的纯逻辑测试，约束初发 BL、治疗线 L 标记、排序、PFS、间隔、时间轴比例与开放当前线判定。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import type { PatientRecord } from '@/types/patient'

import { buildTreatmentGanttProjection } from './treatment-gantt'

const breastCancerRecord: PatientRecord = {
  initialOnset: {
    triggerDate: '2021.07',
    treatment: 'AC方案4次 / 放疗25+5 / 依西美坦 + 亮丙',
  },
  treatmentLines: [
    { endDate: '2023.05', lineNumber: 1, regimen: '阿贝西利 + 氟维司群 + 亮丙瑞林 + 地舒单抗', startDate: '2022.10' },
    { endDate: '2023.10', lineNumber: 2, regimen: '哌柏西利 + 氟维司群 + 亮丙瑞林 + 地舒单抗', startDate: '2023.05' },
    { endDate: '2023.11', lineNumber: 3, regimen: '瑞波西利 + 来曲唑片；氟维司群 + 亮丙瑞林 + 地舒单抗', startDate: '2023.10' },
    { endDate: '2024.02', lineNumber: 4, regimen: '紫杉醇脂质体 + 卡培他滨', startDate: '2023.12' },
    { endDate: '2024.07', lineNumber: 5, regimen: '戈沙妥珠单抗', startDate: '2024.03' },
    { endDate: '2024.09', lineNumber: 6, regimen: '吉西他滨 + 卡铂', startDate: '2024.08' },
    { endDate: '2025.03', lineNumber: 7, regimen: '艾立布林 + 特瑞普利 + 安罗替尼', startDate: '2024.10' },
    { endDate: '2025.09.25', lineNumber: 8, regimen: '白紫 + 依维莫司 + 托瑞米芬 + 安罗替尼', startDate: '2025.04' },
    { lineNumber: 9, regimen: '氟唑帕利 + 哌柏西利 + 托瑞米芬', startDate: '2025.10.01 起' },
  ],
}

describe('buildTreatmentGanttProjection', () => {
  it('builds the demo case as one baseline row plus nine treatment rows', () => {
    const projection = buildTreatmentGanttProjection(breastCancerRecord, 'zh')

    expect(projection.rows.map((row) => row.marker)).toEqual(['BL', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'])
    expect(projection.rows.map((row) => row.pfsLabel)).toEqual([
      'PFS=15个月',
      'PFS=7个月',
      'PFS=5个月',
      'PFS=1个月',
      'PFS=2个月',
      'PFS=4个月',
      'PFS=1个月',
      'PFS=5个月',
      'PFS=约5.8个月',
      'PFS=进行中',
    ])
    expect(projection.rows[0]).toMatchObject({
      isBaseline: true,
      plan: 'AC方案4次 / 放疗25+5 / 依西美坦 + 亮丙',
      rangeLabel: '2021.07-2022.10',
      status: 'complete',
    })
    expect(projection.rows[9]).toMatchObject({
      isCurrent: true,
      plan: '氟唑帕利 + 哌柏西利 + 托瑞米芬',
      rangeLabel: '2025.10.01-至今',
      status: 'ongoing',
    })
  })

  it('computes dashed gaps and year ticks for the scrollable axis', () => {
    const projection = buildTreatmentGanttProjection(breastCancerRecord, 'zh')

    expect(projection.axisTicks.map((tick) => tick.label)).toEqual(['2021 H2', '2022', '2023', '2024', '2025', '2025 Q4'])
    expect(projection.rows[4].gap?.widthPercent).toBeGreaterThan(0)
    expect(projection.rows[5].gap?.widthPercent).toBeGreaterThan(0)
    expect(projection.rows[9].continueFromPercent).toBeGreaterThan(projection.rows[9].bar?.leftPercent ?? 0)
  })

  it('keeps rows without usable dates pending instead of drawing fake bars', () => {
    const projection = buildTreatmentGanttProjection(
      {
        treatmentLines: [
          { endDate: '2023-10', lineNumber: 1, regimen: 'Missing start' },
          { lineNumber: 2, regimen: 'Invalid start', startDate: '待定' },
        ],
      },
      'zh',
    )

    expect(projection.rows).toHaveLength(2)
    expect(projection.rows.every((row) => row.status === 'pending')).toBe(true)
    expect(projection.rows.every((row) => row.bar === null)).toBe(true)
  })

  it('handles empty records without synthetic rows', () => {
    expect(buildTreatmentGanttProjection({ treatmentLines: [] }, 'zh').rows).toEqual([])
  })
})
