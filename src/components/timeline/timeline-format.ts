/**
 * [INPUT]: Locale 与病历可选字段值。
 * [OUTPUT]: 提供时间线显示值、原始编辑值、指标单位和日期范围格式。
 * [POS]: timeline 的纯显示格式辅助，不修改领域数据。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；结构变化时同步所属 AGENTS.md。
 */
import type { Locale } from '@/lib/locale'

export function display(value: unknown): string | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function getEditValue(value: unknown) {
  return value === undefined || value === null ? '' : String(value)
}

export function formatMetric(value: number | undefined, unit: string, locale: Locale) {
  if (value === undefined || !Number.isFinite(value)) return undefined
  if (unit === '岁') return locale === 'zh' ? `${value} 岁` : `${value} years`
  return `${value} ${unit}`
}

export function formatPeriod(startDate?: string, endDate?: string, locale?: Locale) {
  if (!startDate) return endDate
  if (!endDate) return `${startDate} — ${locale === 'zh' ? '至今' : 'Present'}`
  return `${startDate} — ${endDate}`
}
