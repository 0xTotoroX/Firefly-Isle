/**
 * [INPUT]: 依赖 @/lib/locale 的 Locale 类型、demo-record 的默认病例、record-derived 的多段检查证据摘要、record-line-labels 的中文线别、record-timeline-time 的 rail 时间段/PFS facade、PatientFieldTarget 与 components/record/types 的展示类型。
 * [OUTPUT]: 对外提供无装饰性认证状态的 record labels、含癌种/体格指标占位/多段检查证据的 demo summaryMetrics 与带字段保存 target 的 BL/Ln 标记/补充资料/逐线 rail 时间段/每线 PFS 归一演示时间线文案。
 * [POS]: components/record 的静态文案模块，被 RecordDossier 和路由错误态复用；默认病例原始数据留在 demo-record，本文只做文案、字段 target 与 timeline 组装，并复用真实记录的检查证据聚合规则。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { Locale } from '@/lib/locale'
import type { PatientFieldTarget, TreatmentLine } from '@/types/patient'

import { demoPatientRecord } from './demo-record'
import { getRecordEvidenceSummary } from './record-derived'
import { getTreatmentLineSubtitle } from './record-line-labels'
import { formatTreatmentLinePfsLabel, getTimelineRailDate, getTimelineRailRange } from './record-timeline-time'
import type { EvidenceItem, Metric, TimelineEntry } from './types'

export const labels = {
  en: {
    access: 'Protected medical record / Authorized access only',
    back: 'Back to workspace',
    clinicalNotes: 'Clinical Notes',
    exportError: 'Export failed. Please try again later.',
    exportPdf: 'Export PDF',
    exportPdfLoading: 'Exporting PDF...',
    exportPng: 'Export PNG',
    exportPngLoading: 'Exporting PNG...',
    loadingRecord: 'Loading medical record...',
    loadRecordError: 'Unable to load this medical record.',
    missingRecord: 'No authorized medical record was found for this ID.',
    pageTitle: 'Clinical History Dossier',
    timeline: 'Treatment Timeline',
  },
  zh: {
    access: '受控医疗记录 / 仅限授权访问',
    back: '返回工作台',
    clinicalNotes: '临床备注',
    exportError: '导出失败，请稍后重试。',
    exportPdf: '导出 PDF',
    exportPdfLoading: '导出 PDF 中...',
    exportPng: '导出 PNG',
    exportPngLoading: '导出 PNG 中...',
    loadingRecord: '正在载入病历...',
    loadRecordError: '无法载入这份病历。',
    missingRecord: '没有找到当前账号可访问的病历。',
    pageTitle: '临床病史档案',
    timeline: '治疗时间线',
  },
} satisfies Record<Locale, Record<string, string>>

export const summaryMetrics = {
  en: [
    { label: 'Cancer Type', value: 'Breast cancer' },
    { label: 'Gender', value: 'Female' },
    { label: 'Age', value: 'Not provided' },
    { label: 'Height', value: '--' },
    { label: 'Weight', value: '--' },
    { label: 'BMI', value: '--' },
    { label: 'Tumor Stage', value: 'Relapsed advanced' },
    { label: 'Follow-up Status', value: 'In treatment' },
    { label: 'Diagnosis Date', value: '2021.07' },
    { label: 'Genetic Test', value: getRecordEvidenceSummary(demoPatientRecord, 'geneticTest') },
    { label: 'IHC', value: getRecordEvidenceSummary(demoPatientRecord, 'immunohistochemistry') },
    { label: 'Current Plan', value: 'PARP + CDK4/6 + SERM' },
  ],
  zh: [
    { label: '癌种', value: '乳腺癌' },
    { label: '性别', value: '女' },
    { label: '年龄', value: '未提供' },
    { label: '身高', value: '--' },
    { label: '体重', value: '--' },
    { label: 'BMI', value: '--' },
    { label: '肿瘤分期', value: '复发/晚期' },
    { label: '随访状态', value: '治疗中' },
    { label: '诊断日期', value: '2021.07' },
    { label: '基因检测', value: getRecordEvidenceSummary(demoPatientRecord, 'geneticTest') },
    { label: '免疫组化', value: getRecordEvidenceSummary(demoPatientRecord, 'immunohistochemistry') },
    { label: '当前方案', value: 'PARP + CDK4/6 + SERM' },
  ],
} satisfies Record<Locale, Metric[]>

type DemoTreatmentLine = typeof demoPatientRecord.treatmentLines[number]
type InitialOnsetTargetField = Extract<PatientFieldTarget, { section: 'initialOnset' }>['field']
type TreatmentLineTargetField = Extract<PatientFieldTarget, { section: 'treatmentLine' }>['field']

function initialOnsetTarget(field: InitialOnsetTargetField) {
  return { field, section: 'initialOnset' } satisfies PatientFieldTarget
}

function treatmentLineTarget(lineNumber: number, field: TreatmentLineTargetField) {
  return { field, lineNumber, section: 'treatmentLine' } satisfies PatientFieldTarget
}

function treatmentLineRangeTarget(line: TreatmentLine) {
  return {
    end: treatmentLineTarget(line.lineNumber, 'endDate'),
    start: treatmentLineTarget(line.lineNumber, 'startDate'),
  }
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function cleanText(value: string | undefined) {
  return hasText(value) ? value.trim() : ''
}

function getLineTimeframe(line: DemoTreatmentLine, locale: Locale) {
  const railRange = getTimelineRailRange(line.startDate, line.endDate, locale, ' - ')

  if (railRange) {
    return railRange
  }

  return locale === 'zh' ? '时间待补充' : 'Date pending'
}

function getSupplementItems(line: DemoTreatmentLine, locale: Locale) {
  const items: EvidenceItem[] = []

  if (line.immunohistochemistry) {
    items.push({
      label: locale === 'zh' ? '免疫组化' : 'IHC',
      target: treatmentLineTarget(line.lineNumber, 'immunohistochemistry'),
      value: line.immunohistochemistry,
    })
  }

  if (line.geneticTest) {
    items.push({
      label: locale === 'zh' ? '基因检测' : 'Genetic Test',
      target: treatmentLineTarget(line.lineNumber, 'geneticTest'),
      value: line.geneticTest,
    })
  }

  if (line.biopsy) {
    items.push({ label: '', target: treatmentLineTarget(line.lineNumber, 'biopsy'), value: line.biopsy })
  }

  return items
}

function buildInitialTimelineEntry(locale: Locale): TimelineEntry {
  const firstLine = demoPatientRecord.treatmentLines
    .slice()
    .sort((left, right) => left.lineNumber - right.lineNumber)[0]
  const railDate = getTimelineRailRange(demoPatientRecord.initialOnset?.triggerDate, firstLine?.startDate, locale)

  if (locale === 'en') {
    return {
      body: [],
      cards: [
        {
          items: [
            { label: 'IHC', target: initialOnsetTarget('immunohistochemistry'), value: 'Luminal B; ER / PR 90%+ / 90%+; HER2 0; Ki67 60%' },
          ],
          title: 'Supplement',
        },
      ],
      index: 'BL',
      meta: [],
      railDate,
      subtitle: 'Baseline',
      timeframe: getTimelineRailRange(demoPatientRecord.initialOnset?.triggerDate, firstLine?.startDate, locale, ' - ') ?? '2021.07 - 2022.10',
      timeframeTarget: {
        end: firstLine ? treatmentLineTarget(firstLine.lineNumber, 'startDate') : undefined,
        start: initialOnsetTarget('triggerDate'),
      },
      title: 'Initial Treatment',
      treatment: 'AC x4 / RT 25+5 / Exemestane + Leuprorelin',
      treatmentTarget: initialOnsetTarget('treatment'),
    }
  }

  return {
    body: [],
    cards: [
      {
        items: [
          { label: '免疫组化', target: initialOnsetTarget('immunohistochemistry'), value: 'Luminal B；ER / PR 90%+ / 90%+；HER2 0；Ki67 60%' },
        ],
        title: '补充资料',
      },
    ],
      index: 'BL',
    meta: [],
    railDate,
    subtitle: '基线',
    timeframe: getTimelineRailRange(demoPatientRecord.initialOnset?.triggerDate, firstLine?.startDate, locale, ' - ') ?? '2021.07 - 2022.10',
    timeframeTarget: {
      end: firstLine ? treatmentLineTarget(firstLine.lineNumber, 'startDate') : undefined,
      start: initialOnsetTarget('triggerDate'),
    },
    title: '初发治疗',
    treatment: 'AC方案4次 / 放疗25+5 / 依西美坦 + 亮丙',
    treatmentTarget: initialOnsetTarget('treatment'),
  }
}

function buildLineTimelineEntry(line: DemoTreatmentLine, locale: Locale): TimelineEntry {
  const isOpen = !hasText(line.endDate)
  const supplementItems = getSupplementItems(line, locale)

  return {
    badge: isOpen ? (locale === 'zh' ? '进行中' : 'Ongoing') : undefined,
    body: [],
    cards: supplementItems.length > 0
      ? [
          {
            items: supplementItems,
            title: locale === 'zh' ? '补充资料' : 'Supplement',
          },
        ]
      : [],
    index: `L${line.lineNumber}`,
    meta: [],
    railDate: getTimelineRailRange(line.startDate, line.endDate, locale) ?? getTimelineRailDate(line.startDate),
    railMeta: formatTreatmentLinePfsLabel(line.startDate, line.endDate, locale),
    subtitle: getTreatmentLineSubtitle(line.lineNumber, locale),
    timeframe: getLineTimeframe(line, locale),
    timeframeTarget: treatmentLineRangeTarget(line),
    title: locale === 'zh' ? '治疗' : 'Therapy',
    treatment: cleanText(line.regimen) || (locale === 'zh' ? '治疗方案待补充' : 'Regimen pending'),
    treatmentTarget: treatmentLineTarget(line.lineNumber, 'regimen'),
  }
}

export function getTimelineEntries(locale: Locale): TimelineEntry[] {
  return [
    buildInitialTimelineEntry(locale),
    ...demoPatientRecord.treatmentLines
      .slice()
      .sort((left, right) => left.lineNumber - right.lineNumber)
      .map((line) => buildLineTimelineEntry(line, locale)),
  ]
}
