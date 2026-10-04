/**
 * [INPUT]: 依赖 @/lib/locale 的 Locale 类型与 @/lib/timeline-duration 的共享病程时间工具。
 * [OUTPUT]: 对外提供 record 档案专用 rail 日期、含 ongoing 终点的 rail 时间段与 PFS 标签 facade。
 * [POS]: components/record 的时间显示适配层，只封装 dossier 命名，日期解析、ongoing 时间段与 PFS 口径统一委托给 src/lib/timeline-duration。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { Locale } from '@/lib/locale'
import {
  cleanTimelineDate,
  formatCompleteTimelinePfsLabel,
  formatTimelineDateRange,
  formatTreatmentTimelinePfsLabel,
} from '@/lib/timeline-duration'

export function getTimelineRailDate(value?: string) {
  return cleanTimelineDate(value)
}

export function getTimelineRailRange(
  startRaw: string | undefined,
  endRaw: string | undefined,
  locale?: Locale,
  separator = '-',
) {
  return formatTimelineDateRange(startRaw, endRaw, separator, locale === 'zh' ? '至今' : locale === 'en' ? 'Present' : undefined)
}

export function formatTimelinePfsLabel(startRaw: string | undefined, endRaw: string | undefined, locale: Locale) {
  return formatCompleteTimelinePfsLabel(startRaw, endRaw, locale)
}

export function formatTreatmentLinePfsLabel(startRaw: string | undefined, endRaw: string | undefined, locale: Locale) {
  return formatTreatmentTimelinePfsLabel(startRaw, endRaw, locale)
}
