/**
 * [INPUT]: 依赖 @/types/patient 的 PatientRecord 结构真相源。
 * [OUTPUT]: 对外提供 PATIENT_RECORD_SCHEMA 与 buildExtractionPrompt。
 * [POS]: src/lib 的提取提示词边界，用一句式 JSON 字段合同约束 LLM 输出，避免长 schema 或多消息 prompt 触发上游失败。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { PatientRecord } from '@/types/patient'

export const PATIENT_RECORD_SCHEMA = 'basicInfo含 name, gender, age, height, weight, tumorType, diagnosisDate, stage。clinicalNotes 是字符串，承载其他信息或补充备注。initialOnset含 triggerDate, treatment, immunohistochemistry, geneticTest。treatmentLines 是数组，每项含 lineNumber, startDate, endDate, regimen, biopsy, immunohistochemistry, geneticTest。'

const LAB_RESULT_SCHEMA = 'labResults 是数组，每项含 testDate, category, itemCode, itemName, value, unit, referenceLow, referenceHigh, source。'

function shouldRequestLabResults(input: string, existingRecord?: PatientRecord) {
  if (existingRecord?.labResults?.length) {
    return true
  }

  return /\b(cea|ca[-_ ]?\d+|afp|psa|hb|plt|wbc|alt|ast|alp|ldh|crp)\b|参考值|血常规|生化|肿瘤标志物|ng\/?mL|u\/?mL|mmol\/?L/i.test(input)
}

export function buildExtractionPrompt(input: string, existingRecord?: PatientRecord) {
  const requestLabResults = shouldRequestLabResults(input, existingRecord)
  const topFields = requestLabResults
    ? 'basicInfo, clinicalNotes, initialOnset, treatmentLines, labResults'
    : 'basicInfo, clinicalNotes, initialOnset, treatmentLines'

  const promptLines = [
    `从病史提取 JSON。只允许这些顶层字段：${topFields}。${PATIENT_RECORD_SCHEMA}`,
  ]

  if (requestLabResults) {
    promptLines.push(LAB_RESULT_SCHEMA)
  }

  if (existingRecord) {
    promptLines.push(`当前已知记录：${JSON.stringify(existingRecord)}`)
  }

  promptLines.push(`只输出JSON。\n${input.trim()}`)

  return promptLines.join('\n')
}
