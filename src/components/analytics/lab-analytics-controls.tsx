/**
 * [INPUT]: 依赖 lucide-react 图标类型、lab-results 的 TumorMarkerRiseAlert、patient 的 LabResultCategory、lab-analytics-format 的数值格式化与 cn 类名合并工具。
 * [OUTPUT]: 对外提供统计页常量、SummaryCard、LabTimelineDragHint 与 formatAlertWindow。
 * [POS]: components/analytics 的小型展示部件层，集中摘要卡、可读操作提示和固定常量，保持主界面只负责状态编排。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { LucideIcon } from 'lucide-react'

import type { TumorMarkerRiseAlert } from '@/lib/labs/lab-results'
import { cn } from '@/lib/utils'
import type { LabResultCategory } from '@/types/patient'

import { formatValue } from './lab-analytics-format'

export const categories: LabResultCategory[] = ['blood-routine', 'blood-biochemistry', 'tumor-marker']

export const defaultItemByCategory: Record<LabResultCategory, string> = {
  'blood-biochemistry': 'alt',
  'blood-routine': 'wbc',
  'tumor-marker': 'ca15_3',
}

export const defaultChartPointLimit = 12
export const chartDragThreshold = 6
export const scrollAreaClass = '[scrollbar-color:var(--ff-accent-primary)_color-mix(in_srgb,var(--ff-text-primary)_8%,transparent)] [scrollbar-width:thin]'
export const monitorRowClass = 'cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--ff-accent-primary)_8%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--ff-accent-primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ff-accent-primary)]'

export type HighlightedRiseWindow = {
  dates: string[]
  itemCode: string
}

export function SummaryCard({ Icon, label, tone, value }: { Icon: LucideIcon; label: string; tone?: 'alert' | 'safe'; value: string }) {
  return (
    <div className="rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-4 sm:p-5">
      <div className="flex items-start gap-2 text-sm font-semibold leading-6 text-[var(--ff-text-secondary)]">
        <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} />
        <span>{label}</span>
      </div>
      <div className={cn('mt-3 text-3xl font-semibold tabular-nums', tone === 'safe' ? 'text-[var(--ff-text-primary)]' : 'text-[var(--ff-critical)]')}>
        {value}
      </div>
    </div>
  )
}

export function LabTimelineDragHint() {
  return (
    <p aria-label="时间轴可横向拖动" className="mt-2 text-sm leading-6 text-[var(--ff-text-secondary)]" data-scroll-hint="true">
      左右拖动查看历史读数，点击数据点可定位到下方表格。
    </p>
  )
}

export function formatAlertWindow(alert: TumorMarkerRiseAlert) {
  return alert.points.map((point) => formatValue(point.value, point.unit)).join(' → ')
}
