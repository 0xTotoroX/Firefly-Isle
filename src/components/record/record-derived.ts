/**
 * [INPUT]: 依赖 @/types/patient 的 PatientRecord/PatientFieldTarget/PatientRangeTarget、@/lib/patient-metrics 的体格指标格式化、record-timeline-time 的 rail 时间段/PFS facade 与 components/record/types 的展示类型。
 * [OUTPUT]: 对外提供真实 PatientRecord 到含字段保存 target 的 summary metrics 与 BL/Ln 标记/补充资料/逐线 rail 时间段/每线 PFS 归一的紧凑 timeline entries 派生函数。
 * [POS]: components/record 的展示数据转换层，使 dossier JSX 不直接理解 PatientRecord 内部结构，并统一真实记录的中文治疗线别、BMI、多段基因/免疫证据、字段保存 target、日期范围 target、每线 PFS 与详情格式，避免把基础信息重复塞入时间线。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { Locale } from '@/lib/locale'
import { formatBmi, formatHeight, formatWeight } from '@/lib/patient-metrics'
import type { PatientFieldTarget, PatientRangeTarget, PatientRecord, TreatmentLine } from '@/types/patient'

import type { EvidenceItem, Metric, TimelineEntry } from './types'
import { getTreatmentLineSubtitle } from './record-line-labels'
import { formatTreatmentLinePfsLabel, getTimelineRailDate, getTimelineRailRange } from './record-timeline-time'

function hasValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null
}

function displayValue(value: unknown, fallback = '--') {
  if (!hasValue(value)) {
    return fallback
  }

  return typeof value === 'string' ? value.trim() : String(value)
}

function displayRecordAge(age: number | undefined, locale: Locale) {
  if (!Number.isFinite(age)) {
    return '--'
  }

  return locale === 'zh' ? `${age} 岁` : `${age} years`
}

function getCurrentRegimen(record: PatientRecord) {
  const latestLine = [...record.treatmentLines].sort((left, right) => right.lineNumber - left.lineNumber)[0]
  return latestLine?.regimen ?? record.initialOnset?.treatment
}

function getCurrentRegimenTarget(record: PatientRecord): PatientFieldTarget | undefined {
  const latestLine = [...record.treatmentLines].sort((left, right) => right.lineNumber - left.lineNumber)[0]

  if (latestLine) {
    return treatmentLineTarget(latestLine.lineNumber, 'regimen')
  }

  return record.initialOnset ? initialOnsetTarget('treatment') : undefined
}

type EvidenceField = 'geneticTest' | 'immunohistochemistry'
type BasicInfoTargetField = Extract<PatientFieldTarget, { section: 'basicInfo' }>['field']
type InitialOnsetTargetField = Extract<PatientFieldTarget, { section: 'initialOnset' }>['field']
type TreatmentLineTargetField = Extract<PatientFieldTarget, { section: 'treatmentLine' }>['field']

function basicInfoTarget(field: BasicInfoTargetField) {
  return { field, section: 'basicInfo' } satisfies PatientFieldTarget
}

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

function findEvidenceDate(value: string | undefined) {
  return value?.match(/\b(?:19|20)\d{2}(?:[./-]\d{1,2}){0,2}\b/)?.[0]
}

function stripLeadingDate(value: string, date: string | undefined) {
  if (!date || !value.trim().startsWith(date)) {
    return value.trim()
  }

  return value.trim().slice(date.length).replace(/^[\s:：,，;；、-]+/, '').trim()
}

function formatEvidenceSummaryLine(date: string | undefined, value: string) {
  const result = stripLeadingDate(value, date)

  return date ? `${date}：${result}` : result
}

export function getRecordEvidenceSummary(record: PatientRecord, field: EvidenceField) {
  const lines: string[] = []
  const initialValue = displayValue(record.initialOnset?.[field], '')

  if (initialValue) {
    const date = findEvidenceDate(initialValue) ?? record.initialOnset?.triggerDate ?? record.basicInfo?.diagnosisDate
    lines.push(formatEvidenceSummaryLine(date, initialValue))
  }

  record.treatmentLines
    .slice()
    .sort((left, right) => left.lineNumber - right.lineNumber)
    .forEach((line) => {
      const value = displayValue(line[field], '')

      if (!value) {
        return
      }

      const date = findEvidenceDate(value) ?? findEvidenceDate(line.biopsy) ?? findEvidenceDate(line.startDate) ?? line.startDate
      lines.push(formatEvidenceSummaryLine(date, value))
    })

  return lines.length > 0 ? lines.join('\n') : '--'
}

function getTreatmentLineEvidenceItems(line: PatientRecord['treatmentLines'][number], locale: Locale) {
  const items: EvidenceItem[] = []

  if (hasValue(line.immunohistochemistry)) {
    items.push({
      label: locale === 'zh' ? '免疫组化' : 'IHC',
      target: treatmentLineTarget(line.lineNumber, 'immunohistochemistry'),
      value: displayValue(line.immunohistochemistry),
    })
  }

  if (hasValue(line.geneticTest)) {
    items.push({
      label: locale === 'zh' ? '基因检测' : 'Genetic Test',
      target: treatmentLineTarget(line.lineNumber, 'geneticTest'),
      value: displayValue(line.geneticTest),
    })
  }

  if (hasValue(line.biopsy)) {
    items.push({ label: '', target: treatmentLineTarget(line.lineNumber, 'biopsy'), value: displayValue(line.biopsy) })
  }

  return items
}

export function getRecordSummaryMetrics(record: PatientRecord, locale: Locale): Metric[] {
  const basicInfo = record.basicInfo

  return locale === 'zh'
    ? [
        { label: '癌种', target: basicInfoTarget('tumorType'), value: displayValue(basicInfo?.tumorType) },
        { label: '年龄', target: basicInfoTarget('age'), value: displayRecordAge(basicInfo?.age, locale) },
        { label: '性别', target: basicInfoTarget('gender'), value: displayValue(basicInfo?.gender) },
        { label: '身高', target: basicInfoTarget('height'), value: formatHeight(basicInfo?.height) },
        { label: '体重', target: basicInfoTarget('weight'), value: formatWeight(basicInfo?.weight) },
        { label: 'BMI', value: formatBmi(basicInfo?.height, basicInfo?.weight) },
        { label: '肿瘤分期', target: basicInfoTarget('stage'), value: displayValue(basicInfo?.stage) },
        { label: '随访状态', value: record.followUpStatus ? ({ treating: '治疗中', paused: '暂停', completed: '结疗', lost: '失访' }[record.followUpStatus] ?? '待补充') : record.treatmentLines.length > 0 ? '治疗中' : '待补充' },
        { label: '诊断日期', target: basicInfoTarget('diagnosisDate'), value: displayValue(basicInfo?.diagnosisDate) },
        { label: '基因检测', value: getRecordEvidenceSummary(record, 'geneticTest') },
        { label: '免疫组化', value: getRecordEvidenceSummary(record, 'immunohistochemistry') },
        { label: '当前方案', target: getCurrentRegimenTarget(record), value: displayValue(getCurrentRegimen(record)) },
      ]
    : [
        { label: 'Cancer Type', target: basicInfoTarget('tumorType'), value: displayValue(basicInfo?.tumorType) },
        { label: 'Age', target: basicInfoTarget('age'), value: displayRecordAge(basicInfo?.age, locale) },
        { label: 'Gender', target: basicInfoTarget('gender'), value: displayValue(basicInfo?.gender) },
        { label: 'Height', target: basicInfoTarget('height'), value: formatHeight(basicInfo?.height) },
        { label: 'Weight', target: basicInfoTarget('weight'), value: formatWeight(basicInfo?.weight) },
        { label: 'BMI', value: formatBmi(basicInfo?.height, basicInfo?.weight) },
        { label: 'Tumor Stage', target: basicInfoTarget('stage'), value: displayValue(basicInfo?.stage) },
        { label: 'Follow-up Status', value: record.treatmentLines.length > 0 ? 'In treatment' : 'Missing' },
        { label: 'Diagnosis Date', target: basicInfoTarget('diagnosisDate'), value: displayValue(basicInfo?.diagnosisDate) },
        { label: 'Genetic Test', value: getRecordEvidenceSummary(record, 'geneticTest') },
        { label: 'IHC', value: getRecordEvidenceSummary(record, 'immunohistochemistry') },
        { label: 'Current Plan', target: getCurrentRegimenTarget(record), value: displayValue(getCurrentRegimen(record)) },
      ]
}

export function getRecordTimelineEntries(record: PatientRecord, locale: Locale): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const orderedLines = record.treatmentLines.slice().sort((left, right) => left.lineNumber - right.lineNumber)

  if (record.initialOnset) {
    const railDate = getTimelineRailRange(record.initialOnset.triggerDate, orderedLines[0]?.startDate, locale)

    entries.push({
      body: [],
      cards: [
        {
          items: [
            {
              label: locale === 'zh' ? '免疫组化' : 'IHC',
              target: initialOnsetTarget('immunohistochemistry'),
              value: displayValue(record.initialOnset.immunohistochemistry),
            },
            {
              label: locale === 'zh' ? '基因检测' : 'Genetic Test',
              target: initialOnsetTarget('geneticTest'),
              value: displayValue(record.initialOnset.geneticTest),
            },
          ],
          title: locale === 'zh' ? '补充资料' : 'Supplement',
        },
      ],
      index: 'BL',
      meta: [],
      railDate,
      subtitle: locale === 'zh' ? '基线' : 'Baseline',
      timeframe: getTimelineRailRange(record.initialOnset.triggerDate, orderedLines[0]?.startDate, locale, ' - ') ?? displayValue(record.initialOnset.triggerDate),
      timeframeTarget: {
        end: orderedLines[0] ? treatmentLineTarget(orderedLines[0].lineNumber, 'startDate') : undefined,
        start: initialOnsetTarget('triggerDate'),
      },
      title: locale === 'zh' ? '初发诊断' : 'Initial Diagnosis',
      treatment: displayValue(record.initialOnset.treatment, locale === 'zh' ? '初发治疗待补充' : 'Initial treatment missing'),
      treatmentTarget: initialOnsetTarget('treatment'),
    })
  }

  orderedLines
    .forEach((line) => {
      const evidenceItems = getTreatmentLineEvidenceItems(line, locale)
      entries.push({
        badge: locale === 'zh' ? '已保存' : 'Saved',
        body: [],
        cards: evidenceItems.length > 0
          ? [
              {
                items: evidenceItems,
                title: locale === 'zh' ? '补充资料' : 'Supplement',
              },
            ]
          : [],
        index: `L${line.lineNumber}`,
        meta: [],
        railDate: getTimelineRailRange(line.startDate, line.endDate, locale) ?? getTimelineRailDate(line.startDate),
        railMeta: formatTreatmentLinePfsLabel(line.startDate, line.endDate, locale),
        subtitle: getTreatmentLineSubtitle(line.lineNumber, locale),
        timeframe: getTimelineRailRange(line.startDate, line.endDate, locale, ' - ') ?? '--',
        timeframeTarget: treatmentLineRangeTarget(line),
        title: locale === 'zh' ? '治疗' : 'Therapy',
        treatment: displayValue(line.regimen, locale === 'zh' ? '治疗方案待补充' : 'Regimen missing'),
        treatmentTarget: treatmentLineTarget(line.lineNumber, 'regimen'),
      })
    })

  if (entries.length > 0) {
    return entries
  }

  return [
    {
      body: [locale === 'zh' ? '这份病历还没有治疗线信息。' : 'No treatment-line information has been saved yet.'],
      cards: [],
      index: 'BL',
      meta: [],
      subtitle: locale === 'zh' ? '待补充' : 'Missing',
      timeframe: '--',
      title: locale === 'zh' ? '治疗时间线待补充' : 'Treatment Timeline Missing',
      treatment: locale === 'zh' ? '请回到工作台补充结构化病历。' : 'Return to the workspace to complete this record.',
    },
  ]
}
