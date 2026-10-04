/**
 * [INPUT]: JavaScript Date 与 ISO 日历日期字符串。
 * [OUTPUT]: 本地日期、日历天差、日期合法性与相对日期工具。
 * [POS]: 症状、随访和仪表盘共用的日期边界，避免 UTC 截断和夏令时误差。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export function localCalendarDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function calendarDaysBetween(from: string, to: string) {
  if (!isCalendarDate(from) || !isCalendarDate(to)) return Number.NaN
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
}

export function calendarDateOffset(days: number, date = new Date()) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return localCalendarDate(result)
}
