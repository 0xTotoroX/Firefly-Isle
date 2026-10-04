/**
 * [INPUT]: 依赖 @/lib/locale 的 Locale、@/lib/timeline-duration 的共享日期/PFS 工具与 @/types/patient 的 PatientRecord/TreatmentLine/字段编辑目标领域结构。
 * [OUTPUT]: 对外提供 TreatmentGanttProjection、TreatmentGanttRow 与 buildTreatmentGanttProjection，包含可保存字段目标。
 * [POS]: components/timeline 的甘特图纯数据投影层，把初发与治疗线日期归一为可测试、可字段级编辑的 BL/Ln 标记、PFS、bar、gap、axis 与开放当前线状态。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { Locale } from '@/lib/locale'
import {
  formatTimelineDateRange,
  formatTimelinePfsLabelByStatus,
  getTimelineDurationStatus,
  parseTimelineDate,
  type TimelineDurationStatus,
  type TimelineParsedDate,
} from '@/lib/timeline-duration'
import type { PatientFieldTarget, PatientRangeTarget, PatientRecord, TreatmentLine } from '@/types/patient'

export type TreatmentGanttBar = {
  leftPercent: number
  widthPercent: number
}

export type TreatmentGanttGap = {
  leftPercent: number
  widthPercent: number
}

export type TreatmentGanttAxisTick = {
  label: string
  leftPercent: number
}

export type TreatmentGanttEvent = {
  label: string
  leftPercent: number
}

export type TreatmentGanttSupplementPart = {
  label: string
  target?: PatientFieldTarget
  value: string
}

export type TreatmentGanttRow = {
  bar: TreatmentGanttBar | null
  continueFromPercent: number | null
  gap: TreatmentGanttGap | null
  id: string
  isBaseline: boolean
  isCurrent: boolean
  lineNumber: number | null
  marker: string
  pfsLabel: string
  plan: string
  planTarget?: PatientFieldTarget
  rangeLabel: string
  rangeTarget?: PatientRangeTarget
  status: TimelineDurationStatus
  supplementParts: TreatmentGanttSupplementPart[]
}

export type TreatmentGanttProjection = {
  axisTicks: TreatmentGanttAxisTick[]
  canvasWidth: number
  events: TreatmentGanttEvent[]
  rows: TreatmentGanttRow[]
}

type RowDraft = {
  end: TimelineParsedDate | null
  endRaw?: string
  id: string
  isBaseline: boolean
  lineNumber: number | null
  marker: string
  plan?: string
  planTarget?: PatientFieldTarget
  start: TimelineParsedDate | null
  startRaw?: string
  rangeTarget?: PatientRangeTarget
  supplementParts: TreatmentGanttSupplementPart[]
}

const CANVAS_WIDTH = 1680
const ONGOING_MONTHS = 2

function trim(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function roundPercent(value: number) {
  return Number(value.toFixed(3))
}

function formatTreatmentMarker(lineNumber: number) {
  return `L${lineNumber}`
}

type InitialOnsetTargetField = Extract<PatientFieldTarget, { section: 'initialOnset' }>['field']
type TreatmentLineTargetField = Extract<PatientFieldTarget, { section: 'treatmentLine' }>['field']

function initialOnsetTarget(field: InitialOnsetTargetField) {
  return { field, section: 'initialOnset' } satisfies PatientFieldTarget
}

function treatmentLineTarget(lineNumber: number, field: TreatmentLineTargetField) {
  return { field, lineNumber, section: 'treatmentLine' } satisfies PatientFieldTarget
}

function treatmentLineRangeTarget(line: TreatmentLine): PatientRangeTarget {
  return {
    end: treatmentLineTarget(line.lineNumber, 'endDate'),
    start: treatmentLineTarget(line.lineNumber, 'startDate'),
  }
}

function formatRange(startRaw: string | undefined, endRaw: string | undefined, status: TreatmentGanttRow['status'], locale: Locale) {
  if (status === 'complete' || status === 'ongoing') {
    const range = formatTimelineDateRange(startRaw, endRaw, '-', status === 'ongoing' ? (locale === 'zh' ? '至今' : 'Present') : undefined)

    if (range) {
      return range
    }
  }

  return locale === 'zh' ? '日期待补充' : 'Date pending'
}

function buildSupplementParts({
  biopsy,
  geneticTest,
  immunohistochemistry,
  lineNumber,
}: {
  biopsy?: string
  geneticTest?: string
  immunohistochemistry?: string
  lineNumber?: number
}) {
  const parts: TreatmentGanttSupplementPart[] = []
  const target = (field: InitialOnsetTargetField | TreatmentLineTargetField) => {
    if (lineNumber) {
      return treatmentLineTarget(lineNumber, field as TreatmentLineTargetField)
    }

    return field === 'biopsy' ? undefined : initialOnsetTarget(field as InitialOnsetTargetField)
  }

  if (trim(biopsy)) {
    parts.push({ label: '活检/事件', target: target('biopsy'), value: trim(biopsy)! })
  }

  if (trim(immunohistochemistry)) {
    parts.push({ label: '免疫组化', target: target('immunohistochemistry'), value: trim(immunohistochemistry)! })
  }

  if (trim(geneticTest)) {
    parts.push({ label: '基因检测', target: target('geneticTest'), value: trim(geneticTest)! })
  }

  return parts
}

function firstTreatmentLine(lines: TreatmentLine[]) {
  return [...lines].sort((left, right) => left.lineNumber - right.lineNumber)[0]
}

function buildDrafts(record: PatientRecord): RowDraft[] {
  const lines = [...record.treatmentLines].sort((left, right) => left.lineNumber - right.lineNumber)
  const drafts: RowDraft[] = []

  if (record.initialOnset) {
    const firstLine = firstTreatmentLine(lines)

    drafts.push({
      end: parseTimelineDate(firstLine?.startDate),
      endRaw: firstLine?.startDate,
      id: 'initial',
      isBaseline: true,
      lineNumber: null,
      marker: 'BL',
      plan: record.initialOnset.treatment,
      planTarget: initialOnsetTarget('treatment'),
      rangeTarget: {
        end: firstLine ? treatmentLineTarget(firstLine.lineNumber, 'startDate') : undefined,
        start: initialOnsetTarget('triggerDate'),
      },
      start: parseTimelineDate(record.initialOnset.triggerDate),
      startRaw: record.initialOnset.triggerDate,
      supplementParts: buildSupplementParts(record.initialOnset),
    })
  }

  lines.forEach((line) => {
    drafts.push({
      end: parseTimelineDate(line.endDate),
      endRaw: line.endDate,
      id: `line-${line.lineNumber}`,
      isBaseline: false,
      lineNumber: line.lineNumber,
      marker: formatTreatmentMarker(line.lineNumber),
      plan: line.regimen,
      planTarget: treatmentLineTarget(line.lineNumber, 'regimen'),
      rangeTarget: treatmentLineRangeTarget(line),
      start: parseTimelineDate(line.startDate),
      startRaw: line.startDate,
      supplementParts: buildSupplementParts({ ...line, lineNumber: line.lineNumber }),
    })
  })

  return drafts
}

function percent(point: number, domainStart: number, domainEnd: number) {
  const span = Math.max(domainEnd - domainStart, 1)
  return roundPercent(((point - domainStart) / span) * 100)
}

function widthPercent(start: number, end: number, domainStart: number, domainEnd: number) {
  const span = Math.max(domainEnd - domainStart, 1)
  return roundPercent(((end - start) / span) * 100)
}

function buildAxisTicks(domainStart: number, domainEnd: number): TreatmentGanttAxisTick[] {
  const startYear = Math.floor(domainStart / 12)
  const startMonth = Math.floor(domainStart % 12) + 1
  const endYear = Math.floor(domainEnd / 12)
  const ticks: TreatmentGanttAxisTick[] = [
    {
      label: startMonth >= 7 ? `${startYear} H2` : `${startYear}`,
      leftPercent: 0,
    },
  ]

  for (let year = startYear + 1; year <= endYear; year += 1) {
    const point = year * 12

    if (point > domainStart && point <= domainEnd) {
      ticks.push({
        label: `${year}`,
        leftPercent: percent(point, domainStart, domainEnd),
      })
    }
  }

  const q4Point = endYear * 12 + 9

  if (q4Point > domainStart && q4Point <= domainEnd && !ticks.some((tick) => tick.label === `${endYear} Q4`)) {
    ticks.push({
      label: `${endYear} Q4`,
      leftPercent: percent(q4Point, domainStart, domainEnd),
    })
  }

  return ticks
}

function getPlanFallback(locale: Locale) {
  return locale === 'zh' ? '方案待补充' : 'Regimen pending'
}

export function buildTreatmentGanttProjection(record: PatientRecord, locale: Locale): TreatmentGanttProjection {
  const drafts = buildDrafts(record)
  const datedStarts = drafts.flatMap((draft) => (draft.start ? [draft.start.point] : []))

  if (datedStarts.length === 0) {
    return {
      axisTicks: [],
      canvasWidth: CANVAS_WIDTH,
      events: [],
      rows: drafts.map((draft) => ({
        bar: null,
        continueFromPercent: null,
        gap: null,
        id: draft.id,
        isBaseline: draft.isBaseline,
        isCurrent: false,
        lineNumber: draft.lineNumber,
        marker: draft.marker,
        pfsLabel: formatTimelinePfsLabelByStatus(draft.start, draft.end, 'pending', locale),
        plan: trim(draft.plan) ?? getPlanFallback(locale),
        planTarget: draft.planTarget,
        rangeLabel: formatRange(draft.startRaw, draft.endRaw, 'pending', locale),
        rangeTarget: draft.rangeTarget,
        status: 'pending',
        supplementParts: draft.supplementParts,
      })),
    }
  }

  const displayEnds = drafts.flatMap((draft) => {
    if (!draft.start) {
      return []
    }

    if (draft.end) {
      return [draft.end.point]
    }

    return [draft.start.point + ONGOING_MONTHS]
  })
  const domainStart = Math.min(...datedStarts)
  const domainEnd = Math.max(...displayEnds, domainStart + 1)
  let previousEnd: number | null = null

  const rows = drafts.map((draft) => {
    const status = getTimelineDurationStatus(draft.start, draft.end, draft.endRaw)
    const displayEnd = status === 'ongoing' && draft.start ? draft.start.point + ONGOING_MONTHS : draft.end?.point
    const gap = draft.start && previousEnd !== null && draft.start.point > previousEnd
      ? {
          leftPercent: percent(previousEnd, domainStart, domainEnd),
          widthPercent: widthPercent(previousEnd, draft.start.point, domainStart, domainEnd),
        }
      : null
    const bar = draft.start && displayEnd !== undefined && displayEnd >= draft.start.point && status !== 'pending'
      ? {
        leftPercent: percent(draft.start.point, domainStart, domainEnd),
          widthPercent: widthPercent(draft.start.point, displayEnd, domainStart, domainEnd),
        }
      : null

    if (displayEnd !== undefined && status !== 'pending') {
      previousEnd = displayEnd
    }

    return {
      bar,
      continueFromPercent: status === 'ongoing' && displayEnd !== undefined ? percent(displayEnd, domainStart, domainEnd) : null,
      gap,
      id: draft.id,
      isBaseline: draft.isBaseline,
      isCurrent: status === 'ongoing',
      lineNumber: draft.lineNumber,
      marker: draft.marker,
      pfsLabel: formatTimelinePfsLabelByStatus(draft.start, draft.end, status, locale),
      plan: trim(draft.plan) ?? getPlanFallback(locale),
      planTarget: draft.planTarget,
      rangeLabel: formatRange(draft.startRaw, draft.endRaw, status, locale),
      rangeTarget: draft.rangeTarget,
      status,
      supplementParts: draft.supplementParts,
    }
  })

  return {
    axisTicks: buildAxisTicks(domainStart, domainEnd),
    canvasWidth: CANVAS_WIDTH,
    events: rows.flatMap((row) => {
      const draft = drafts.find((item) => item.id === row.id)
      return draft?.start ? [{ label: row.marker, leftPercent: percent(draft.start.point, domainStart, domainEnd) }] : []
    }),
    rows,
  }
}
