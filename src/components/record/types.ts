/**
 * [INPUT]: 依赖 @/types/patient 的 PatientFieldTarget 与 PatientRangeTarget，只描述 record dossier 展示层的数据形状。
 * [OUTPUT]: 对外提供 ExportFormat、带字段保存目标的 Metric/EvidenceCard、含 rail 日期/PFS 的 TimelineEntry 等病例详情展示类型。
 * [POS]: components/record 的类型边界，被 dossier、文案与派生数据模块共享。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { PatientFieldTarget, PatientRangeTarget } from '@/types/patient'

export type ExportFormat = 'pdf' | 'png'

export type Metric = {
  label: string
  target?: PatientFieldTarget
  value: string
}

export type EvidenceItem = {
  label: string
  target?: PatientFieldTarget
  value: string
}

export type EvidenceCard = {
  title: string
  items: EvidenceItem[]
}

export type TimelineEntry = {
  badge?: string
  body: string[]
  cards: EvidenceCard[]
  footMetrics?: Metric[]
  highlight?: {
    body: string
    title: string
  }
  index: string
  meta: Metric[]
  railDate?: string
  railMeta?: string
  subtitle: string
  timeframe: string
  timeframeTarget?: PatientRangeTarget
  title: string
  treatment: string
  treatmentTarget?: PatientFieldTarget
}
