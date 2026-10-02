/**
 * [INPUT]: 依赖 @/lib/lab-dictionary 的分类字典、OCR 候选归一化和参考范围解析，依赖 @/lib/lab-results 的血常规派生指标生成。
 * [OUTPUT]: 对外提供 LabReviewRow、OCR 复核行、逐行校验、确认读数与报告日期解析。
 * [POS]: lib 的网页端实验室报告摄入纯逻辑层，把 OCR 文本转成可复核表格行，并在确认后输出可写入 Supabase 的 LabResult。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  findLabIndicator,
  getLabIndicatorsByCategory,
  matchLabIndicatorInText,
  normalizeLabCandidate,
  parseReferenceRange,
} from '@/lib/lab-dictionary'
import { buildDerivedBloodRoutineReadings } from '@/lib/lab-results'
import { isCalendarDate } from '@/lib/calendar-date'
import type { LabResult, LabResultCategory } from '@/types/patient'

export type LabReviewRow = {
  id: string
  include: boolean
  itemCode: string
  itemName: string
  message: string
  rawText: string
  referenceHigh: string
  referenceLow: string
  status: 'mapped' | 'needs-review'
  testDate: string
  unit: string
  value: string
}

const DATE_PATTERNS = [
  /(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/,
  /(\d{4})[-/.年](\d{1,2})月?/,
] as const

function pad(value: string) {
  return value.padStart(2, '0')
}

export function buildLabReportDate(text: string) {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)

    if (!match) {
      continue
    }

    const [, year, month, day] = match
    return day ? `${year}-${pad(month)}-${pad(day)}` : `${year}-${pad(month)}`
  }

  return ''
}

function extractReferenceText(line: string) {
  const explicit = line.match(/参考(?:范围|值)?[:：]?\s*([<>≤≥]?\s*-?\d+(?:\.\d+)?\s*(?:[-~～至]\s*-?\d+(?:\.\d+)?)?)/)

  return explicit?.[1] ?? ''
}

function stripKnownNoise(line: string, category: LabResultCategory) {
  const item = matchLabIndicatorInText(category, line)
  let clean = line

  if (item) {
    for (const alias of item.aliases) {
      clean = clean.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
    }
  }

  return clean
    .replace(/\d{4}[-/.年]\d{1,2}(?:[-/.月]\d{1,2}日?)?/g, ' ')
    .replace(/参考(?:范围|值)?[:：]?\s*[<>≤≥]?\s*-?\d+(?:\.\d+)?\s*(?:[-~～至]\s*-?\d+(?:\.\d+)?)?/g, ' ')
}

function extractValue(line: string, category: LabResultCategory) {
  const clean = stripKnownNoise(line, category)
  const match = clean.match(/-?\d+(?:\.\d+)?/)

  return match?.[0] ?? ''
}

function createReviewRow(rawText: string, category: LabResultCategory, fallbackDate: string, index: number): LabReviewRow | null {
  const item = matchLabIndicatorInText(category, rawText)

  if (!item) {
    // 日期和报告标题不是指标；其他未匹配行留给用户映射或排除。
    const withoutDate = rawText.replace(/\d{4}[-/.年]\d{1,2}(?:[-/.月]\d{1,2}日?)?/g, '').trim()
    if (!withoutDate || /^(?:检验日期|检查日期|报告日期|采样日期|日期|姓名|性别|年龄|科室|医院|标本|样本|检验报告|检验项目|项目名称)/.test(withoutDate)) return null
    return {
      id: `lab-review-${index}`, include: true, itemCode: '', itemName: rawText,
      message: '未匹配到内置实验室字典，请选择指标或排除该行。', rawText,
      referenceHigh: '', referenceLow: '', status: 'needs-review', testDate: fallbackDate,
      unit: '', value: extractValue(rawText, category),
    }
  }

  const referenceText = extractReferenceText(rawText)
  const value = extractValue(rawText, category)
  const normalized = normalizeLabCandidate(
    {
      itemName: item.name,
      rawText,
      referenceRange: referenceText,
      testDate: fallbackDate || undefined,
      value,
    },
    category,
  )
  const reading = normalized.reading
  const range = parseReferenceRange(referenceText)

  return {
    id: `lab-review-${index}`,
    include: true,
    itemCode: reading?.itemCode ?? item.code,
    itemName: reading?.itemName ?? item.name,
    message: normalized.message,
    rawText,
    referenceHigh: String(reading?.referenceHigh ?? range?.high ?? item.referenceHigh ?? ''),
    referenceLow: String(reading?.referenceLow ?? range?.low ?? item.referenceLow ?? ''),
    status: normalized.status === 'mapped' ? 'mapped' : 'needs-review',
    testDate: reading?.testDate ?? fallbackDate,
    unit: reading?.unit ?? item.unit ?? '',
    value: reading ? String(reading.value) : value,
  }
}

export function extractLabReportReviewRows(ocrText: string, category: LabResultCategory): LabReviewRow[] {
  const fallbackDate = buildLabReportDate(ocrText)

  return ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => createReviewRow(line, category, fallbackDate, index))
    .filter((row): row is LabReviewRow => row !== null)
}

function numberOrUndefined(value: string) {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export type LabReviewIssue = 'indicator' | 'value' | 'date' | 'reference'

export function getLabReviewIssues(row: LabReviewRow, category?: LabResultCategory): LabReviewIssue[] {
  if (!row.include) return []
  const issues: LabReviewIssue[] = []
  if (!row.itemCode || (category && !findLabIndicator(category, row.itemCode))) issues.push('indicator')
  if (numberOrUndefined(row.value) === undefined) issues.push('value')
  if (!isCalendarDate(row.testDate)) issues.push('date')
  const low = numberOrUndefined(row.referenceLow)
  const high = numberOrUndefined(row.referenceHigh)
  if ((row.referenceLow.trim() && low === undefined) || (row.referenceHigh.trim() && high === undefined) || (low !== undefined && high !== undefined && low > high)) issues.push('reference')
  return issues
}

export function hasBlockingReviewRows(rows: LabReviewRow[], category?: LabResultCategory) {
  return rows.some((row) => getLabReviewIssues(row, category).length > 0)
}

export function toConfirmedLabReadings(rows: LabReviewRow[], category: LabResultCategory): LabResult[] {
  if (hasBlockingReviewRows(rows, category)) throw new Error('Resolve the included lab review rows before saving.')
  const directReadings = rows
    .filter((row) => row.include)
    .flatMap((row) => {
      const item = findLabIndicator(category, row.itemCode) ?? getLabIndicatorsByCategory(category).find((entry) => entry.code === row.itemCode)
      const value = numberOrUndefined(row.value)

      if (!item || value === undefined) {
        return []
      }

      return [
        {
          category,
          itemCode: item.code,
          itemName: item.name,
          referenceHigh: numberOrUndefined(row.referenceHigh),
          referenceLow: numberOrUndefined(row.referenceLow),
          source: 'ocr' as const,
          testDate: row.testDate.trim() || undefined,
          unit: row.unit.trim() || item.unit,
          value,
        },
      ]
    })

  return category === 'blood-routine' ? [...directReadings, ...buildDerivedBloodRoutineReadings(directReadings)] : directReadings
}
