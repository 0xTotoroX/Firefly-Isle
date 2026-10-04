/**
 * [INPUT]: 依赖 @/lib/llm 的 chat/json_object 能力，依赖 @/types/patient 的 PatientRecord/LabResult 数据模型。
 * [OUTPUT]: 对外提供 ClinicalAnalysisResult、ClinicalAnalysisParseError、buildClinicalAnalysisMessages、parseClinicalAnalysisResponse 与 analyzePatientRecord。
 * [POS]: src/lib 的临床辅助分析边界，把 PatientRecord/labResults 压缩为非诊断 prompt，并把 LLM JSON 输出校验为 UI 可展示结构。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { chat, type Message } from '@/lib/llm'
import type { LabResult, PatientRecord, TreatmentLine } from '@/types/patient'

export type ClinicalAnalysisResult = {
  attentionPoints: string[]
  disclaimer: string
  followUpQuestions: string[]
  labTrendSummary: string[]
  treatmentSummary: string[]
}

export class ClinicalAnalysisParseError extends Error {
  constructor(message = 'Invalid clinical analysis response.') {
    super(message)
    this.name = 'ClinicalAnalysisParseError'
  }
}

const FALLBACK_DISCLAIMER = '仅作病历整理和随访沟通参考，不构成诊断、疾病进展判断、用药建议或治疗指令。'

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function compactList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  return values.map(cleanText).filter(Boolean).slice(0, 6)
}

function getCurrentLine(lines: TreatmentLine[]) {
  return [...lines].sort((left, right) => right.lineNumber - left.lineNumber)[0]
}

function summarizeTreatmentLines(record: PatientRecord) {
  const segments: string[] = []

  if (record.initialOnset) {
    segments.push([
      '初发',
      record.initialOnset.triggerDate ? `时间=${record.initialOnset.triggerDate}` : '',
      record.initialOnset.treatment ? `治疗=${record.initialOnset.treatment}` : '',
      record.initialOnset.immunohistochemistry ? `IHC=${record.initialOnset.immunohistochemistry}` : '',
      record.initialOnset.geneticTest ? `基因=${record.initialOnset.geneticTest}` : '',
    ].filter(Boolean).join('；'))
  }

  for (const line of [...record.treatmentLines].sort((left, right) => left.lineNumber - right.lineNumber)) {
    segments.push([
      `L${line.lineNumber}`,
      line.startDate || line.endDate ? `时间=${line.startDate ?? '待补充'}-${line.endDate ?? '至今'}` : '',
      line.regimen ? `方案=${line.regimen}` : '方案=待补充',
      line.biopsy ? `活检=${line.biopsy}` : '',
      line.immunohistochemistry ? `IHC=${line.immunohistochemistry}` : '',
      line.geneticTest ? `基因=${line.geneticTest}` : '',
    ].filter(Boolean).join('；'))
  }

  return segments.length > 0 ? segments.join('\n') : '暂无治疗线或初发治疗信息。'
}

function summarizeLabs(labResults: LabResult[] | undefined) {
  if (!labResults || labResults.length === 0) {
    return '暂无已保存实验室指标。'
  }

  return labResults
    .slice()
    .sort((left, right) => `${left.category}:${left.itemCode}:${left.testDate ?? ''}`.localeCompare(`${right.category}:${right.itemCode}:${right.testDate ?? ''}`))
    .map((reading) => [
      reading.category,
      reading.itemName,
      reading.testDate ? `日期=${reading.testDate}` : '日期=待补充',
      `值=${reading.value}${reading.unit ? ` ${reading.unit}` : ''}`,
      reading.referenceLow !== undefined || reading.referenceHigh !== undefined
        ? `参考=${reading.referenceLow ?? '-'}-${reading.referenceHigh ?? '-'}`
        : '',
    ].filter(Boolean).join('；'))
    .slice(0, 40)
    .join('\n')
}

export function buildClinicalAnalysisMessages(record: PatientRecord): Message[] {
  const basicInfo = record.basicInfo ?? {}
  const currentLine = getCurrentLine(record.treatmentLines)
  const recordSummary = [
    `姓名: ${basicInfo.name ?? '未提供'}`,
    `性别: ${basicInfo.gender ?? '未提供'}`,
    `年龄: ${basicInfo.age ?? '未提供'}`,
    `癌种: ${basicInfo.tumorType ?? '未提供'}`,
    `分期: ${basicInfo.stage ?? '未提供'}`,
    `诊断日期: ${basicInfo.diagnosisDate ?? '未提供'}`,
    `当前方案: ${currentLine?.regimen ?? record.initialOnset?.treatment ?? '未提供'}`,
    `临床备注: ${record.clinicalNotes ?? '无'}`,
  ].join('\n')

  return [
    {
      role: 'system',
      content: [
        'You produce concise Chinese clinical-record organization notes for oncology follow-up.',
        'You must not diagnose, infer disease progression, recommend medication, or issue treatment instructions.',
        'Return only JSON with keys: treatmentSummary, labTrendSummary, attentionPoints, followUpQuestions, disclaimer.',
        'Each array should contain short Chinese strings. disclaimer must say the output is not diagnosis or treatment advice.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        '请基于以下已保存结构化资料生成辅助分析，只做整理和复核提醒。',
        '如果没有实验室指标，labTrendSummary 必须说明“暂无已保存实验室指标”。',
        '禁止编造未提供的检查、指标、诊断或治疗建议。',
        '',
        '[基本信息]',
        recordSummary,
        '',
        '[治疗线]',
        summarizeTreatmentLines(record),
        '',
        '[实验室指标]',
        summarizeLabs(record.labResults),
      ].join('\n'),
    },
  ]
}

function parseJsonObject(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]
  const raw = fenced ?? trimmed

  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new ClinicalAnalysisParseError()
  }
}

export function parseClinicalAnalysisResponse(text: string, hasLabResults: boolean): ClinicalAnalysisResult {
  const payload = parseJsonObject(text)
  const treatmentSummary = compactList(payload.treatmentSummary)
  const labTrendSummary = compactList(payload.labTrendSummary)
  const attentionPoints = compactList(payload.attentionPoints)
  const followUpQuestions = compactList(payload.followUpQuestions)
  const disclaimer = cleanText(payload.disclaimer) || FALLBACK_DISCLAIMER

  if (treatmentSummary.length === 0 && attentionPoints.length === 0) {
    throw new ClinicalAnalysisParseError()
  }

  return {
    attentionPoints,
    disclaimer,
    followUpQuestions,
    labTrendSummary: hasLabResults ? labTrendSummary : ['暂无已保存实验室指标，无法生成指标趋势分析。'],
    treatmentSummary,
  }
}

export async function analyzePatientRecord(record: PatientRecord): Promise<ClinicalAnalysisResult> {
  const response = await chat(buildClinicalAnalysisMessages(record), { responseFormat: 'json_object' })
  return parseClinicalAnalysisResponse(response, (record.labResults?.length ?? 0) > 0)
}
