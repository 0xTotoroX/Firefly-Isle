/**
 * [INPUT]: 依赖 @/lib/locale 的 Locale 类型。
 * [OUTPUT]: 对外提供 getTreatmentLineSubtitle，用 lineNumber 生成中文一线/二线治疗或英文 Line N Therapy。
 * [POS]: components/record 的治疗线命名工具，供 demo 文案与真实 PatientRecord 派生层共享，避免线别格式在多个文件里漂移。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { Locale } from '@/lib/locale'

const CHINESE_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const

function formatChineseNumber(value: number) {
  if (value <= 0) {
    return String(value)
  }

  if (value < 10) {
    return CHINESE_DIGITS[value]
  }

  if (value < 20) {
    return `十${CHINESE_DIGITS[value - 10]}`
  }

  if (value < 100) {
    const tens = Math.floor(value / 10)
    const ones = value % 10
    return `${CHINESE_DIGITS[tens]}十${CHINESE_DIGITS[ones]}`
  }

  return String(value)
}

export function getTreatmentLineSubtitle(lineNumber: number, locale: Locale) {
  if (locale === 'zh') {
    return `${formatChineseNumber(lineNumber)}线治疗`
  }

  return `Line ${lineNumber} Therapy`
}
