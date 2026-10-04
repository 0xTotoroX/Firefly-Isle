/**
 * [INPUT]: calendar-date 的本地日历函数。
 * [OUTPUT]: 清晨日期、闰日、跨月与夏令时边界的回归。
 * [POS]: 日期型业务的共享行为测试。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'
import { calendarDateOffset, calendarDaysBetween, isCalendarDate, localCalendarDate } from './calendar-date'

describe('calendar dates', () => {
  it('uses the local date before eight in the morning', () => {
    expect(localCalendarDate(new Date(2026, 8, 12, 7, 30))).toBe('2026-09-12')
  })
  it('rejects nonexistent dates and accepts leap days', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false)
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('2024-02-29')).toBe(true)
    expect(isCalendarDate('2026-9-1')).toBe(false)
  })
  it('counts calendar days over DST and month boundaries', () => {
    expect(calendarDaysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(calendarDaysBetween('2026-10-31', '2026-11-02')).toBe(2)
    expect(calendarDaysBetween('2026-09-12', '2026-09-10')).toBe(-2)
    expect(calendarDateOffset(-1, new Date(2026, 2, 1, 1))).toBe('2026-02-28')
  })
})
