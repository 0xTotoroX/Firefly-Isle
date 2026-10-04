/**
 * [INPUT]: 依赖 @/types/patient 的 LabResult 领域模型与 @/lib/labs/lab-dictionary 的项目字典/参考范围。
 * [OUTPUT]: 对外提供 DEFAULT_LAB_REFERENCE_RANGES、LabTrendRow、buildLabTrendRows、buildDerivedBloodRoutineReadings、buildLabChartSeries、summarizeLatestAbnormalByCategory 与 detectTumorMarkerContinuousRise。
 * [POS]: lib/labs 的实验室趋势纯逻辑边界，集中参考范围、异常分类、血常规派生、图表序列、最近异常与肿瘤标志物连续上涨提示，不承载 UI。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { findLabIndicator, getReferenceRangeForIndicator, type ReferenceRange } from '@/lib/labs/lab-dictionary'
import type { LabResult, LabResultCategory } from '@/types/patient'

export type LabTrendStatus = 'normal' | 'high' | 'low' | 'persistent-high' | 'reference-missing'

export type LabTrendRow = {
  category: LabResultCategory
  itemCode: string
  itemName: string
  latestDate: string | null
  latestValue: number
  readingCount: number
  referenceRangeLabel: string
  status: LabTrendStatus
  trendWarning: string | null
  undatedCount: number
  unit?: string
}

export type LabChartPoint = {
  date: string
  referenceHigh?: number
  referenceLow?: number
  referenceRangeLabel: string
  status: Exclude<LabTrendStatus, 'persistent-high'>
  unit?: string
  value: number
}

export type LabChartSeries = {
  itemCode: string
  itemName: string
  points: LabChartPoint[]
  undatedCount: number
}

export type LatestAbnormalReading = {
  category: LabResultCategory
  itemCode: string
  itemName: string
  referenceRangeLabel: string
  status: 'high' | 'low'
  testDate: string
  unit?: string
  value: number
}

export type LatestAbnormalSummary = {
  abnormalReadings: LatestAbnormalReading[]
  category: LabResultCategory
  latestDate: string | null
  missingReferenceCount: number
}

export type TumorMarkerRiseAlert = {
  cumulativeRiseRatio: number
  intervalRiseRatios: [number, number]
  itemCode: string
  itemName: string
  points: [LabChartPoint, LabChartPoint, LabChartPoint]
  unit?: string
}

export const DEFAULT_LAB_REFERENCE_RANGES: Record<string, ReferenceRange> = {
  alt: { high: 40, low: 0 },
  ca125: { high: 35, low: 0 },
  cea: { high: 5, low: 0 },
  wbc: { high: 9.5, low: 3.5 },
} satisfies Record<string, ReferenceRange>

const LAB_CATEGORIES: LabResultCategory[] = ['blood-routine', 'blood-biochemistry', 'tumor-marker']
const TUMOR_MARKER_RISE_THRESHOLD = 0.2

function groupByItem(readings: LabResult[]) {
  const groups = new Map<string, LabResult[]>()

  for (const reading of readings) {
    const key = `${reading.category}:${reading.itemCode}`
    groups.set(key, [...(groups.get(key) ?? []), reading])
  }

  return groups
}

function hasDate(reading: LabResult) {
  return typeof reading.testDate === 'string' && reading.testDate.trim().length > 0
}

function sortByDate(readings: LabResult[]) {
  return readings.filter(hasDate).sort((left, right) => left.testDate!.localeCompare(right.testDate!))
}

function getReferenceRange(reading: LabResult): ReferenceRange | null {
  const rowRange = {
    high: reading.referenceHigh,
    low: reading.referenceLow,
  }

  if (rowRange.high !== undefined || rowRange.low !== undefined) {
    return rowRange
  }

  return DEFAULT_LAB_REFERENCE_RANGES[reading.itemCode] ?? getReferenceRangeForIndicator(reading.itemCode)
}

export function formatReferenceRange(range: ReferenceRange | null, unit?: string) {
  if (!range) {
    return '需补充参考范围'
  }

  const suffix = unit ? ` ${unit}` : ''

  if (range.low !== undefined && range.high !== undefined) {
    return `${range.low}-${range.high}${suffix}`
  }

  if (range.low !== undefined) {
    return `≥ ${range.low}${suffix}`
  }

  return `≤ ${range.high}${suffix}`
}

export function classifyLabReading(reading: LabResult): Exclude<LabTrendStatus, 'persistent-high'> {
  const range = getReferenceRange(reading)

  if (!range) {
    return 'reference-missing'
  }

  if (range.high !== undefined && reading.value > range.high) {
    return 'high'
  }

  if (range.low !== undefined && reading.value < range.low) {
    return 'low'
  }

  return 'normal'
}

function countLatestConsecutiveHigh(readings: LabResult[]) {
  let count = 0

  for (const reading of [...readings].reverse()) {
    if (classifyLabReading(reading) !== 'high') {
      break
    }

    count += 1
  }

  return count
}

function latestReading(readings: LabResult[]) {
  const dated = sortByDate(readings)
  return dated.at(-1) ?? readings.at(-1)
}

export function buildLabTrendRows(readings: LabResult[]): LabTrendRow[] {
  return [...groupByItem(readings).entries()]
    .map(([, group]) => {
      const latest = latestReading(group)!
      const dated = sortByDate(group)
      const latestStatus = classifyLabReading(latest)
      const persistentHigh = dated.length > 1 && countLatestConsecutiveHigh(dated) >= 2
      const status: LabTrendStatus = persistentHigh ? 'persistent-high' : latestStatus

      return {
        category: latest.category,
        itemCode: latest.itemCode,
        itemName: latest.itemName,
        latestDate: hasDate(latest) ? latest.testDate! : null,
        latestValue: latest.value,
        readingCount: group.length,
        referenceRangeLabel: formatReferenceRange(getReferenceRange(latest), latest.unit),
        status,
        trendWarning: persistentHigh ? '连续多次高于参考范围，仅作趋势提示，请结合临床资料人工确认。' : null,
        undatedCount: group.length - dated.length,
        unit: latest.unit,
      }
    })
    .sort((left, right) => left.itemName.localeCompare(right.itemName))
}

function roundTrendValue(value: number) {
  return Math.round(value * 100) / 100
}

function toChartPoint(reading: LabResult): LabChartPoint {
  const range = getReferenceRange(reading)

  return {
    date: reading.testDate!,
    referenceHigh: range?.high,
    referenceLow: range?.low,
    referenceRangeLabel: formatReferenceRange(range, reading.unit),
    status: classifyLabReading(reading),
    unit: reading.unit,
    value: reading.value,
  }
}

export function buildLabChartSeries(readings: LabResult[], itemCode: string): LabChartSeries {
  const matched = readings.filter((reading) => reading.itemCode === itemCode)
  const dated = sortByDate(matched)
  const latest = latestReading(matched)

  return {
    itemCode,
    itemName: latest?.itemName ?? itemCode,
    points: dated.map(toChartPoint),
    undatedCount: matched.length - dated.length,
  }
}

export function summarizeLatestAbnormalByCategory(readings: LabResult[]): LatestAbnormalSummary[] {
  return LAB_CATEGORIES.map((category) => {
    const dated = sortByDate(readings.filter((reading) => reading.category === category))
    const latestDate = dated.at(-1)?.testDate ?? null
    const latestReadings = latestDate ? dated.filter((reading) => reading.testDate === latestDate) : []
    const abnormalReadings: LatestAbnormalReading[] = []
    let missingReferenceCount = 0

    for (const reading of latestReadings) {
      const status = classifyLabReading(reading)

      if (status === 'reference-missing') {
        missingReferenceCount += 1
        continue
      }

      if (status !== 'high' && status !== 'low') {
        continue
      }

      abnormalReadings.push({
        category,
        itemCode: reading.itemCode,
        itemName: reading.itemName,
        referenceRangeLabel: formatReferenceRange(getReferenceRange(reading), reading.unit),
        status,
        testDate: reading.testDate!,
        unit: reading.unit,
        value: reading.value,
      })
    }

    return { abnormalReadings, category, latestDate, missingReferenceCount }
  })
}

function getRiseRatio(previous: LabChartPoint, next: LabChartPoint) {
  if (previous.value <= 0) {
    return null
  }

  return (next.value - previous.value) / previous.value
}

function findLatestContinuousRise(points: LabChartPoint[], threshold: number) {
  for (let index = points.length - 3; index >= 0; index -= 1) {
    const window = points.slice(index, index + 3) as [LabChartPoint, LabChartPoint, LabChartPoint]
    const firstRise = getRiseRatio(window[0], window[1])
    const secondRise = getRiseRatio(window[1], window[2])

    if (firstRise !== null && secondRise !== null && firstRise > threshold && secondRise > threshold) {
      return { firstRise, secondRise, window }
    }
  }

  return null
}

export function detectTumorMarkerContinuousRise(readings: LabResult[], threshold = TUMOR_MARKER_RISE_THRESHOLD): TumorMarkerRiseAlert[] {
  return [...groupByItem(readings.filter((reading) => reading.category === 'tumor-marker')).values()]
    .map((group) => {
      const points = sortByDate(group).map(toChartPoint)

      if (points.length < 3) {
        return null
      }

      const match = findLatestContinuousRise(points, threshold)

      if (!match) {
        return null
      }

      const latestPoint = match.window[2]
      const firstReading = group[0]

      const alert: TumorMarkerRiseAlert = {
        cumulativeRiseRatio: getRiseRatio(match.window[0], latestPoint) ?? 0,
        intervalRiseRatios: [match.firstRise, match.secondRise] as [number, number],
        itemCode: firstReading.itemCode,
        itemName: firstReading.itemName,
        points: match.window,
      }

      if (latestPoint.unit) {
        alert.unit = latestPoint.unit
      }

      return alert
    })
    .filter((alert): alert is TumorMarkerRiseAlert => alert !== null)
}

function readingValue(readings: LabResult[], itemCode: string) {
  return readings.find((reading) => reading.category === 'blood-routine' && reading.itemCode === itemCode)?.value
}

function derivedReading(
  readings: LabResult[],
  code: 'mlr' | 'nlr' | 'plr',
  numeratorCode: string,
  denominatorCode: string,
  method: string,
): LabResult | null {
  const numerator = readingValue(readings, numeratorCode)
  const denominator = readingValue(readings, denominatorCode)

  if (numerator === undefined || denominator === undefined || denominator <= 0) {
    return null
  }

  const item = findLabIndicator('blood-routine', code)
  const source = readings.find((reading) => reading.itemCode === numeratorCode || reading.itemCode === denominatorCode)

  return {
    batchId: source?.batchId,
    category: 'blood-routine',
    derivationMethod: method,
    isDerived: true,
    itemCode: item?.code ?? code,
    itemName: item?.name ?? code.toUpperCase(),
    source: 'derived',
    testDate: source?.testDate,
    value: roundTrendValue(numerator / denominator),
  }
}

export function buildDerivedBloodRoutineReadings(readings: LabResult[]): LabResult[] {
  return [
    derivedReading(readings, 'nlr', 'neutrophil_abs', 'lymphocyte_abs', '中性粒细胞绝对值 / 淋巴细胞绝对值'),
    derivedReading(readings, 'plr', 'platelet', 'lymphocyte_abs', '血小板 / 淋巴细胞绝对值'),
    derivedReading(readings, 'mlr', 'monocyte_abs', 'lymphocyte_abs', '单核细胞绝对值 / 淋巴细胞绝对值'),
  ].filter((reading): reading is LabResult => reading !== null)
}
