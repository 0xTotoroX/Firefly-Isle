/**
 * [INPUT]: 依赖 @/lib/llm 的 chat 边界、@/lib/extractionPrompt、@/types/patient。
 * [OUTPUT]: 对外提供 MAX_FOLLOW_UP_ROUNDS、ExtractionParseError、normalizePatientRecord、getMissingCriticalFields、mergePatientRecord、buildFollowUpQuestion、parsePatientRecordResponse、getExtractionFailureMessage、extractPatientRecord 与 runExtractionWithFollowUps，保留姓名/性别/年龄/身高/体重确定性补全、临床备注、模型 id 清洗、labResults 独立结构、中文/点号日期归一化、错误文案分流、单消息 JSON mode 降级重试与 502 Gemini 系统兜底。
 * [POS]: src/lib 的信息提取主链路，把解析、归一化、缺失字段检测与追问 merge 收敛在一处。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { buildExtractionPrompt } from '@/lib/extractionPrompt'
import { ChatError, chat } from '@/lib/llm'
import type { Locale } from '@/lib/locale'
import { type Message } from '@/lib/llm/types'
import type { BasicInfo, LabResult, LabResultCategory, LabResultSource, PatientRecord, TreatmentLine } from '@/types/patient'

const CRITICAL_FIELDS = ['tumorType', 'stage', 'regimen'] as const
const DATE_PATTERN = /^\d{4}-(\d{2})(-\d{2})?$/
const LAB_CATEGORIES = new Set<LabResultCategory>(['blood-routine', 'blood-biochemistry', 'tumor-marker'])
const LAB_SOURCES = new Set<LabResultSource>(['ocr', 'manual', 'test', 'derived'])
export const MAX_FOLLOW_UP_ROUNDS = 3

type CriticalField = (typeof CRITICAL_FIELDS)[number]

type NormalizePatientRecordOptions = {
  preserveId?: boolean
}

export class ExtractionParseError extends Error {
  rawResponse: string

  constructor(rawResponse: string) {
    super('Failed to parse extracted PatientRecord JSON.')
    this.name = 'ExtractionParseError'
    this.rawResponse = rawResponse
  }
}

function stripMarkdownFences(input: string) {
  const trimmed = input.trim()

  if (!trimmed.startsWith('```')) {
    return trimmed
  }

  return trimmed
    .replace(/^```[a-zA-Z]*\n?/, '')
    .replace(/```$/, '')
    .trim()
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = Number(value.trim())
    return Number.isFinite(normalized) ? normalized : undefined
  }

  return undefined
}

function normalizeDate(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const parts = value
    .trim()
    .replace(/[年/.]/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/-+$/g, '')
    .split('-')
    .filter(Boolean)

  if (parts.length !== 2 && parts.length !== 3) {
    return undefined
  }

  const [year, month, day] = parts

  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || (day !== undefined && !/^\d{1,2}$/.test(day))) {
    return undefined
  }

  const monthNumber = Number(month)
  const dayNumber = day === undefined ? undefined : Number(day)

  if (monthNumber < 1 || monthNumber > 12 || (dayNumber !== undefined && (dayNumber < 1 || dayNumber > 31))) {
    return undefined
  }

  const normalized = `${year}-${month.padStart(2, '0')}${day === undefined ? '' : `-${day.padStart(2, '0')}`}`
  return DATE_PATTERN.test(normalized) ? normalized : undefined
}

function normalizeTreatmentLine(line: Partial<TreatmentLine> | undefined, fallbackLineNumber: number, preserveId: boolean): TreatmentLine {
  return {
    id: preserveId ? normalizeString(line?.id) : undefined,
    lineNumber: normalizeNumber(line?.lineNumber) ?? fallbackLineNumber,
    startDate: normalizeDate(line?.startDate),
    endDate: normalizeDate(line?.endDate),
    regimen: typeof line?.regimen === 'string' && line.regimen.trim() ? line.regimen.trim() : undefined,
    biopsy: typeof line?.biopsy === 'string' && line.biopsy.trim() ? line.biopsy.trim() : undefined,
    immunohistochemistry:
      typeof line?.immunohistochemistry === 'string' && line.immunohistochemistry.trim()
        ? line.immunohistochemistry.trim()
        : undefined,
    geneticTest:
      typeof line?.geneticTest === 'string' && line.geneticTest.trim() ? line.geneticTest.trim() : undefined,
  }
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberFromMatch(match: RegExpMatchArray | null) {
  return normalizeNumber(match?.[1])
}

function inRange(value: number | undefined, min: number, max: number) {
  return value !== undefined && value >= min && value <= max ? value : undefined
}

function extractDemographicName(input: string) {
  const explicit = input.match(/(?:患者姓名|病人姓名|姓名)[:：]?\s*([\u4e00-\u9fa5A-Za-z·]{2,12})/)

  if (explicit?.[1]) {
    return explicit[1].trim()
  }

  for (const line of input.split(/\n+/).map((item) => item.trim())) {
    if (!/\d{1,3}\s*岁/.test(line) || !/(^|[，,、\s])(男|女)(?=$|[，,。；;\s])/.test(line)) {
      continue
    }

    const inferred = line.match(/^([\u4e00-\u9fa5A-Za-z·]{2,12})[，,、\s]+(?:\d{1,3}\s*岁|男|女)/)
    if (inferred?.[1]) {
      return inferred[1].trim()
    }
  }

  return undefined
}

function extractBasicInfoFromText(input: string): Partial<BasicInfo> | undefined {
  const age = inRange(numberFromMatch(input.match(/(?:年龄[:：]?\s*)?(\d{1,3})\s*岁/)), 0, 130)
  const height = inRange(
    numberFromMatch(input.match(/身高[:：]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:厘米|cm)?/i)) ??
      numberFromMatch(input.match(/(\d{2,3}(?:\.\d+)?)\s*(?:厘米|cm)/i)),
    40,
    260,
  )
  const weight = inRange(
    numberFromMatch(input.match(/体重[:：]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:千克|公斤|kg)?/i)) ??
      numberFromMatch(input.match(/(\d{2,3}(?:\.\d+)?)\s*(?:千克|公斤|kg)/i)),
    1,
    300,
  )
  const gender = input.match(/(?:^|[，,。；;\s])(男|女)(?=$|[，,。；;\s])/)?.[1]
  const basicInfo: Partial<BasicInfo> = {
    age,
    gender,
    height,
    name: extractDemographicName(input),
    weight,
  }
  const entries = Object.entries(basicInfo).filter(([, value]) => value !== undefined)

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function applySourceTextBasicInfo(record: PatientRecord, input: string): PatientRecord {
  const basicInfo = extractBasicInfoFromText(input)

  if (!basicInfo) {
    return record
  }

  return normalizePatientRecord({
    ...record,
    basicInfo: mergeDefinedFields(record.basicInfo, basicInfo),
  })
}

function normalizeLabCategory(value: unknown): LabResultCategory | undefined {
  return typeof value === 'string' && LAB_CATEGORIES.has(value as LabResultCategory) ? (value as LabResultCategory) : undefined
}

function normalizeLabSource(value: unknown): LabResultSource | undefined {
  return typeof value === 'string' && LAB_SOURCES.has(value as LabResultSource) ? (value as LabResultSource) : undefined
}

function normalizeLabResult(reading: Partial<LabResult> | undefined, preserveId: boolean): LabResult | null {
  const category = normalizeLabCategory(reading?.category)
  const itemCode = normalizeString(reading?.itemCode)
  const itemName = normalizeString(reading?.itemName)
  const value = normalizeNumber(reading?.value)

  if (!category || !itemCode || !itemName || value === undefined) {
    return null
  }

  return {
    id: preserveId ? normalizeString(reading?.id) : undefined,
    batchId: preserveId ? normalizeString(reading?.batchId) : undefined,
    category,
    derivationMethod: normalizeString(reading?.derivationMethod),
    isDerived: reading?.isDerived === true,
    itemCode,
    itemName,
    referenceHigh: normalizeNumber(reading?.referenceHigh),
    referenceLow: normalizeNumber(reading?.referenceLow),
    source: normalizeLabSource(reading?.source),
    testDate: normalizeDate(reading?.testDate),
    unit: normalizeString(reading?.unit),
    value,
  }
}

export function normalizePatientRecord(input: Partial<PatientRecord>, options: NormalizePatientRecordOptions = {}): PatientRecord {
  const preserveId = options.preserveId ?? true
  const treatmentLines = Array.isArray(input.treatmentLines)
    ? input.treatmentLines.map((line, index) => normalizeTreatmentLine(line, index + 1, preserveId))
    : []
  const labResults = Array.isArray(input.labResults)
    ? input.labResults.map((reading) => normalizeLabResult(reading, preserveId)).filter((reading): reading is LabResult => reading !== null)
    : undefined

  return {
    id: preserveId && typeof input.id === 'string' && input.id.trim() ? input.id.trim() : undefined,
    followUpStatus: preserveId ? input.followUpStatus : undefined,
    basicInfo: input.basicInfo
      ? {
          name:
            typeof input.basicInfo.name === 'string' && input.basicInfo.name.trim()
              ? input.basicInfo.name.trim()
              : undefined,
          gender:
            typeof input.basicInfo.gender === 'string' && input.basicInfo.gender.trim()
              ? input.basicInfo.gender.trim()
              : undefined,
          age: normalizeNumber(input.basicInfo.age),
          height: normalizeNumber(input.basicInfo.height),
          weight: normalizeNumber(input.basicInfo.weight),
          tumorType:
            typeof input.basicInfo.tumorType === 'string' && input.basicInfo.tumorType.trim()
              ? input.basicInfo.tumorType.trim()
              : undefined,
          diagnosisDate: normalizeDate(input.basicInfo.diagnosisDate),
          stage:
            typeof input.basicInfo.stage === 'string' && input.basicInfo.stage.trim()
              ? input.basicInfo.stage.trim()
              : undefined,
      }
      : undefined,
    clinicalNotes: normalizeString(input.clinicalNotes),
    initialOnset: input.initialOnset
      ? {
          triggerDate: normalizeDate(input.initialOnset.triggerDate),
          treatment:
            typeof input.initialOnset.treatment === 'string' && input.initialOnset.treatment.trim()
              ? input.initialOnset.treatment.trim()
              : undefined,
          immunohistochemistry:
            typeof input.initialOnset.immunohistochemistry === 'string' && input.initialOnset.immunohistochemistry.trim()
              ? input.initialOnset.immunohistochemistry.trim()
              : undefined,
          geneticTest:
            typeof input.initialOnset.geneticTest === 'string' && input.initialOnset.geneticTest.trim()
              ? input.initialOnset.geneticTest.trim()
              : undefined,
        }
      : undefined,
    labResults: labResults && labResults.length > 0 ? labResults : undefined,
    treatmentLines: treatmentLines.sort((a, b) => a.lineNumber - b.lineNumber),
  }
}

export function getMissingCriticalFields(record: PatientRecord): string[] {
  const missing = new Set<string>()

  for (const field of CRITICAL_FIELDS) {
    if (field === 'regimen') {
      const hasRegimen =
        (record.initialOnset?.treatment && record.initialOnset.treatment.trim().length > 0) ||
        record.treatmentLines.some((line) => typeof line.regimen === 'string' && line.regimen.trim().length > 0)

      if (!hasRegimen) {
        missing.add('regimen')
      }

      continue
    }

    if (!record.basicInfo?.[field]?.trim()) {
      missing.add(field)
    }
  }

  return [...missing]
}

function mergeTreatmentLines(current: TreatmentLine[], incoming: TreatmentLine[]) {
  const byLineNumber = new Map<number, TreatmentLine>()

  for (const line of current) {
    byLineNumber.set(line.lineNumber, line)
  }

  for (const line of incoming) {
    const existing = byLineNumber.get(line.lineNumber)

    byLineNumber.set(line.lineNumber, {
      ...existing,
      ...line,
      id: existing?.id,
      lineNumber: line.lineNumber,
      regimen: line.regimen ?? existing?.regimen,
      biopsy: line.biopsy ?? existing?.biopsy,
      immunohistochemistry: line.immunohistochemistry ?? existing?.immunohistochemistry,
      geneticTest: line.geneticTest ?? existing?.geneticTest,
      startDate: line.startDate ?? existing?.startDate,
      endDate: line.endDate ?? existing?.endDate,
    })
  }

  return [...byLineNumber.values()].sort((a, b) => a.lineNumber - b.lineNumber)
}

function mergeLabResults(current: LabResult[] | undefined, incoming: LabResult[] | undefined) {
  if (!incoming?.length) return current
  const merged = [...(current ?? [])]
  for (const reading of incoming) {
    const repeated = reading.testDate && merged.some((existing) =>
      existing.testDate === reading.testDate && existing.category === reading.category &&
      existing.itemCode === reading.itemCode && existing.value === reading.value && existing.unit === reading.unit)
    if (!repeated) merged.push(reading)
  }
  return merged
}

function mergeDefinedFields<T extends object>(current: T | undefined, incoming: T | undefined): T | undefined {
  const next = { ...(current ?? {}) } as Record<string, unknown>

  for (const [key, value] of Object.entries(incoming ?? {})) {
    if (value !== undefined) {
      next[key] = value
    }
  }

  return Object.keys(next).length > 0 ? (next as T) : undefined
}

export function mergePatientRecord(current: PatientRecord, incoming: Partial<PatientRecord>) {
  const normalizedIncoming = normalizePatientRecord(incoming, { preserveId: false })

  return normalizePatientRecord({
    ...current,
    basicInfo: mergeDefinedFields(current.basicInfo, normalizedIncoming.basicInfo),
    clinicalNotes: normalizedIncoming.clinicalNotes ?? current.clinicalNotes,
    initialOnset: mergeDefinedFields(current.initialOnset, normalizedIncoming.initialOnset),
    labResults: mergeLabResults(current.labResults, normalizedIncoming.labResults),
    treatmentLines: mergeTreatmentLines(current.treatmentLines, normalizedIncoming.treatmentLines),
  })
}

export function buildFollowUpQuestion(missingFields: string[]) {
  if (missingFields.length === 0) {
    return null
  }

  const labels: Record<CriticalField, string> = {
    tumorType: '肿瘤类型',
    stage: '分期',
    regimen: '治疗方案',
  }

  return `还缺少这些关键信息：${missingFields
    .map((field) => labels[field as CriticalField] ?? field)
    .join('、')}。请一次性补充。`
}

export function parsePatientRecordResponse(response: string) {
  const normalizedJson = stripMarkdownFences(response)

  try {
    const parsed = JSON.parse(normalizedJson) as Partial<PatientRecord>
    return normalizePatientRecord(parsed, { preserveId: false })
  } catch {
    throw new ExtractionParseError(response)
  }
}

export function getExtractionFailureMessage(error: unknown, locale: Locale, phase: 'follow-up' | 'initial') {
  const messages = locale === 'zh'
    ? {
        auth: '登录状态已失效，请重新登录或重新进入匿名会话后再提取。',
        invalidRequest: '模型请求被拒绝，请稍后重试或切换模型设置。',
        invalidResponse: phase === 'follow-up' ? '追问解析失败，请重试这轮补充。' : '解析失败，请检查返回内容后重试。',
        network: '当前网络不可用，请联网后重试。',
        rateLimit: '请求太频繁，请稍等一分钟后再重试。',
        timeout: '模型响应超时，请稍后重试。',
        upstream: '模型服务暂时不可用，请稍后重试或切换到 API 自提供。',
        unknown: phase === 'follow-up' ? '追问合并失败，请重新提交这轮补充。' : '提取失败，请稍后重试。',
      }
    : {
        auth: 'Your session expired. Sign in again or start a new anonymous session before extracting.',
        invalidRequest: 'The model request was rejected. Try again later or change model settings.',
        invalidResponse: phase === 'follow-up' ? 'Follow-up parsing failed. Retry this answer.' : 'Parsing failed. Check the returned content and retry.',
        network: 'Network unavailable. Reconnect and retry.',
        rateLimit: 'Too many requests. Wait about one minute and retry.',
        timeout: 'The model response timed out. Please retry later.',
        upstream: 'The model service is temporarily unavailable. Retry later or use your own API provider.',
        unknown: phase === 'follow-up' ? 'Follow-up merge failed. Submit this answer again.' : 'Extraction failed. Please try again later.',
      }

  if (error instanceof ExtractionParseError) {
    return messages.invalidResponse
  }

  if (!(error instanceof ChatError)) {
    return messages.unknown
  }

  if (error.name === 'AuthError') return messages.auth
  if (error.name === 'LLMNetworkUnavailableError') return messages.network
  if (error.name === 'LLMRateLimitError') return messages.rateLimit
  if (error.name === 'LLMTimeoutError') return messages.timeout
  if (error.name === 'LLMUpstreamError' || error.name === 'ConfigurationError') return messages.upstream
  if (error.name === 'LLMInvalidRequestError') return messages.invalidRequest
  if (error.name === 'LLMInvalidResponseError') return messages.invalidResponse

  return messages.unknown
}

function shouldRetryBuiltInProvider(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    'status' in error &&
    error.status === 502 &&
    (error.name === 'LLMUpstreamError' || error.name === 'LLMInvalidResponseError')
  )
}

async function requestPatientRecordJson(messages: Message[]) {
  try {
    return await chat(messages, { responseFormat: 'json_object' })
  } catch (error) {
    if (!shouldRetryBuiltInProvider(error)) {
      throw error
    }
  }

  try {
    return await chat(messages)
  } catch (error) {
    if (!shouldRetryBuiltInProvider(error)) {
      throw error
    }
  }

  return chat(messages, { provider: 'gemini', responseFormat: 'json_object' })
}

export async function extractPatientRecord(input: string, existingRecord?: PatientRecord): Promise<PatientRecord> {
  const messages: Message[] = [
    {
      role: 'user',
      content: buildExtractionPrompt(input, existingRecord),
    },
  ]
  const response = await requestPatientRecordJson(messages)

  const normalized = applySourceTextBasicInfo(parsePatientRecordResponse(response), input)

  return existingRecord ? mergePatientRecord(existingRecord, normalized) : normalized
}

export async function runExtractionWithFollowUps(input: string, answers: string[] = []) {
  let record = await extractPatientRecord(input)
  const askedQuestions: string[] = []

  for (const answer of answers.slice(0, MAX_FOLLOW_UP_ROUNDS)) {
    const missing = getMissingCriticalFields(record)

    if (missing.length === 0) {
      break
    }

    const question = buildFollowUpQuestion(missing)

    if (question) {
      askedQuestions.push(question)
    }

    record = await extractPatientRecord(answer, record)
  }

  return {
    askedQuestions,
    missingFields: getMissingCriticalFields(record),
    record,
  }
}
