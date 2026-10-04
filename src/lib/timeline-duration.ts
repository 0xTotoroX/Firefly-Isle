/**
 * [INPUT]: 依赖 @/lib/locale 的 Locale 类型，消费病例时间线中的原始日期文本。
 * [OUTPUT]: 对外提供日期清理/解析、含 ongoing 终点的时间段标签、PFS 文案与治疗持续状态工具。
 * [POS]: src/lib 的病程时间纯逻辑，被 record 档案 rail 与 treatment Gantt 投影共享，避免两个视图重复发明时间段与 PFS 口径。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { Locale } from '@/lib/locale'

export type TimelineDurationStatus = 'complete' | 'ongoing' | 'pending'

export type TimelineParsedDate = {
  day: number | null
  month: number
  point: number
  time: number
  year: number
}

type TimelineDateParts = {
  day: number | null
  maxDay: number
  month: number
  year: number
}

const MONTH_MS = 30.4375 * 24 * 60 * 60 * 1000

function normalizeTimelineDate(value?: string) {
  return value?.trim().replace(/\s+/g, ' ') || undefined
}

export function cleanTimelineDate(value?: string) {
  return normalizeTimelineDate(value)?.replace(/\s*(起|至今|present|ongoing)$/i, '') || undefined
}

export function formatTimelineDateRange(
  startRaw: string | undefined,
  endRaw: string | undefined,
  separator = '-',
  openEndLabel?: string,
) {
  const start = cleanTimelineDate(startRaw)
  const end = cleanTimelineDate(endRaw)

  if (start && end) {
    return `${start}${separator}${end}`
  }

  if (start && openEndLabel) {
    return `${start}${separator}${openEndLabel}`
  }

  return start ?? end
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isValidDateParts(month: number, day: number | null, maxDay: number) {
  return month >= 1 && month <= 12 && (day === null || (day >= 1 && day <= maxDay))
}

function getDateParts(raw: string): TimelineDateParts | null {
  const match = raw
    .replace(/[年月/]/g, '-')
    .replace(/日/g, '')
    .replace(/\./g, '-')
    .match(/(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = match[2] ? Number(match[2]) : 1
  const day = match[3] ? Number(match[3]) : null

  return { day, maxDay: daysInMonth(year, month), month, year }
}

export function parseTimelineDate(value?: string): TimelineParsedDate | null {
  const parts = cleanTimelineDate(value)
  const dateParts = parts ? getDateParts(parts) : null

  if (!dateParts || !isValidDateParts(dateParts.month, dateParts.day, dateParts.maxDay)) {
    return null
  }

  const { day, maxDay, month, year } = dateParts

  return {
    day,
    month,
    point: year * 12 + month - 1 + (day === null ? 0 : (day - 1) / maxDay),
    time: Date.UTC(year, month - 1, day ?? 1),
    year,
  }
}

export function getTimelineDurationStatus(
  start: TimelineParsedDate | null,
  end: TimelineParsedDate | null,
  endRaw?: string,
): TimelineDurationStatus {
  if (start && end && end.point >= start.point) {
    return 'complete'
  }

  if (start && !cleanTimelineDate(endRaw)) {
    return 'ongoing'
  }

  return 'pending'
}

function getPendingPfsLabel(locale: Locale) {
  return locale === 'zh' ? 'PFS=待补充' : 'PFS=pending'
}

function getOngoingPfsLabel(locale: Locale) {
  return locale === 'zh' ? 'PFS=进行中' : 'PFS=ongoing'
}

function formatPfsMonths(start: TimelineParsedDate, end: TimelineParsedDate, locale: Locale) {
  const hasDayPrecision = start.day !== null || end.day !== null
  const months = hasDayPrecision ? Math.max((end.time - start.time) / MONTH_MS, 0) : Math.max(end.point - start.point, 0)

  if (hasDayPrecision) {
    const value = Number(months.toFixed(1))
    return locale === 'zh' ? `PFS=约${value}个月` : `PFS=about ${value} mo`
  }

  return locale === 'zh' ? `PFS=${Math.round(months)}个月` : `PFS=${Math.round(months)} mo`
}

export function formatTimelinePfsLabelByStatus(
  start: TimelineParsedDate | null,
  end: TimelineParsedDate | null,
  status: TimelineDurationStatus,
  locale: Locale,
) {
  if (status === 'ongoing') {
    return getOngoingPfsLabel(locale)
  }

  if (status === 'pending' || !start || !end || end.point < start.point) {
    return getPendingPfsLabel(locale)
  }

  return formatPfsMonths(start, end, locale)
}

export function formatCompleteTimelinePfsLabel(startRaw: string | undefined, endRaw: string | undefined, locale: Locale) {
  const start = parseTimelineDate(startRaw)
  const end = parseTimelineDate(endRaw)

  if (!start || !end || end.point < start.point) {
    return undefined
  }

  return formatPfsMonths(start, end, locale)
}

export function formatTreatmentTimelinePfsLabel(startRaw: string | undefined, endRaw: string | undefined, locale: Locale) {
  const start = parseTimelineDate(startRaw)
  const end = parseTimelineDate(endRaw)
  const status = getTimelineDurationStatus(start, end, endRaw)

  return formatTimelinePfsLabelByStatus(start, end, status, locale)
}
