/**
 * [INPUT]: 依赖 vitest 的 describe/it/expect 与 timeline-duration 的病程时间纯逻辑。
 * [OUTPUT]: 对外提供共享时间段、PFS 与持续状态工具的回归测试。
 * [POS]: lib/records 的病程时间合同测试，确保 record 档案 rail 与 treatment Gantt 使用同一日期/PFS 口径。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import {
  formatCompleteTimelinePfsLabel,
  formatTimelineDateRange,
  formatTreatmentTimelinePfsLabel,
  getTimelineDurationStatus,
  parseTimelineDate,
} from './timeline-duration'

describe('timeline-duration', () => {
  it('formats compact date ranges for baseline rail labels', () => {
    expect(formatTimelineDateRange('2021.07', '2022.10')).toBe('2021.07-2022.10')
    expect(formatTimelineDateRange('2025.10.01 起', undefined)).toBe('2025.10.01')
    expect(formatTimelineDateRange('2025.10.01 起', undefined, '-', '至今')).toBe('2025.10.01-至今')
  })

  it('uses the same month calculation for complete treatment lines', () => {
    expect(formatTreatmentTimelinePfsLabel('2022.10', '2023.05', 'zh')).toBe('PFS=7个月')
    expect(formatTreatmentTimelinePfsLabel('2025.04', '2025.09.25', 'zh')).toBe('PFS=约5.8个月')
    expect(formatCompleteTimelinePfsLabel('2021.07', '2022.10', 'zh')).toBe('PFS=15个月')
  })

  it('classifies ongoing and pending treatment durations', () => {
    expect(getTimelineDurationStatus(parseTimelineDate('2025.10.01 起'), null, undefined)).toBe('ongoing')
    expect(formatTreatmentTimelinePfsLabel('2025.10.01 起', undefined, 'zh')).toBe('PFS=进行中')
    expect(formatTreatmentTimelinePfsLabel(undefined, '2023.10', 'zh')).toBe('PFS=待补充')
    expect(formatTreatmentTimelinePfsLabel('2024.02', '2024.01', 'zh')).toBe('PFS=待补充')
  })
})
