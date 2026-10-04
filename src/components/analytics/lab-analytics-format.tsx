/**
 * [INPUT]: 依赖 lucide-free 的普通 JSX、@/lib/labs/lab-results 的 LabTrendStatus 与 cn 类名合并工具。
 * [OUTPUT]: 对外提供实验室统计页共用数值格式化、状态文案、StatusLabel 与 RiseRatioLabel。
 * [POS]: components/analytics 的展示格式层，被统计主面板与趋势图共享，避免状态文案和数值格式散落在大组件里。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { LabTrendStatus } from '@/lib/labs/lab-results'
import { cn } from '@/lib/utils'

export const statusText: Record<LabTrendStatus, string> = {
  high: '偏高',
  low: '偏低',
  normal: '正常',
  'persistent-high': '持续偏高',
  'reference-missing': '缺参考',
}

export const statusArrow: Record<LabTrendStatus, string> = {
  high: '↑',
  low: '↓',
  normal: '',
  'persistent-high': '↑',
  'reference-missing': '',
}

const statusToneClass: Record<LabTrendStatus, string> = {
  high: 'text-[var(--ff-critical)]',
  low: 'text-[var(--ff-low)]',
  normal: 'text-[var(--ff-accent-success)]',
  'persistent-high': 'text-[var(--ff-critical)]',
  'reference-missing': 'text-[var(--ff-text-muted)]',
}

export function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return String(value)
  }

  const normalized = Math.abs(value) < 1e-9 ? 0 : value

  if (Number.isInteger(normalized)) {
    return String(normalized)
  }

  const abs = Math.abs(normalized)
  const decimals = abs >= 1 ? 2 : abs >= 0.01 ? 3 : 6

  return normalized.toFixed(decimals).replace(/\.?0+$/, '')
}

export function formatValue(value: number, unit?: string) {
  return `${formatNumber(value)}${unit ? ` ${unit}` : ''}`
}

export function formatRatio(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatStatusLabel(status: LabTrendStatus) {
  return [statusArrow[status], statusText[status]].filter(Boolean).join(' ')
}

function compactStatusMark(status: LabTrendStatus) {
  if (status === 'normal') {
    return '✓'
  }

  if (status === 'reference-missing') {
    return '—'
  }

  return statusArrow[status]
}

export function StatusLabel({ compact = false, status }: { compact?: boolean; status: LabTrendStatus }) {
  return (
    <span aria-label={statusText[status]} className={cn('inline-flex items-center gap-1 font-semibold', statusToneClass[status])}>
      {compact ? (
        <span aria-hidden="true" className="font-[var(--ff-font-mono)]">{compactStatusMark(status)}</span>
      ) : (
        <>
          {statusArrow[status] ? <span aria-hidden="true" className="font-[var(--ff-font-mono)]">{statusArrow[status]}</span> : null}
          {statusText[status]}
        </>
      )}
    </span>
  )
}

export function RiseRatioLabel({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-[var(--ff-critical)]">
      <span aria-hidden="true" className="font-[var(--ff-font-mono)]">↑</span>
      {children}
    </span>
  )
}
