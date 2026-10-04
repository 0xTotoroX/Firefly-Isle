/**
 * [INPUT]: 依赖 lucide-react 图标类型、lab-results 的 TumorMarkerRiseAlert、patient 的 LabResultCategory、lab-analytics-format 的数值格式化与 cn 类名合并工具。
 * [OUTPUT]: 对外提供统计页常量、SummaryCard、LabTimelineDragHint 与 formatAlertWindow。
 * [POS]: components/analytics 的小型展示部件层，把 dashboard 中可复用的控制台卡片、拖动提示和固定常量抽离，保持主界面只负责状态编排。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { LucideIcon } from 'lucide-react'

import type { TumorMarkerRiseAlert } from '@/lib/lab-results'
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

export function SummaryCard({ Icon, index, label, tone, value }: { Icon: LucideIcon; index: string; label: string; tone?: 'alert' | 'safe'; value: string }) {
  return (
    <div
      className={cn(
        'relative min-h-[104px] overflow-hidden rounded-[var(--ff-radius-md)] border bg-[var(--ff-surface-panel)] px-4 py-4 sm:px-5',
        tone === 'safe'
          ? 'border-[color-mix(in_srgb,var(--ff-accent-success)_34%,var(--ff-border-default))]'
          : 'border-[color-mix(in_srgb,var(--ff-accent-primary)_42%,var(--ff-border-default))]',
      )}
    >
      <div className="grid h-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
        <span className="font-[var(--ff-font-mono)] text-[10px] font-bold text-[var(--ff-text-muted)] sm:justify-self-start">{index}</span>
        <span
          aria-hidden="true"
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-[var(--ff-radius-sm)] border sm:h-11 sm:w-11',
            tone === 'safe'
              ? 'border-[color-mix(in_srgb,var(--ff-accent-success)_50%,transparent)] text-[var(--ff-accent-success)]'
              : 'border-[color-mix(in_srgb,var(--ff-accent-primary)_60%,transparent)] text-[var(--ff-accent-text)]',
          )}
        >
          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <div className="truncate whitespace-nowrap text-sm font-semibold text-[var(--ff-text-secondary)]">{label}</div>
          <div className="mt-0.5 truncate whitespace-nowrap font-[var(--ff-font-mono)] text-[10px] text-[var(--ff-text-muted)]">指标管理</div>
        </div>
        <div className={cn('col-span-2 min-w-0 justify-self-end whitespace-nowrap font-[var(--ff-font-display)] text-[clamp(2rem,8vw,3.5rem)] font-black leading-none tracking-normal sm:col-span-1 sm:text-[clamp(2rem,4vw,3.25rem)]', tone === 'safe' ? 'text-[var(--ff-accent-success)]' : 'text-[var(--ff-accent-text)]')}>
          {value}
        </div>
      </div>
    </div>
  )
}

export function LabTimelineDragHint() {
  return (
    <span
      aria-label="时间轴可横向拖动"
      className="pointer-events-none absolute right-4 top-3 z-10 inline-flex h-8 w-32 items-center justify-center rounded-[var(--ff-radius-full)] border border-[color-mix(in_srgb,var(--ff-accent-primary)_48%,transparent)] bg-[var(--ff-surface-accent)] shadow-[0_0_22px_color-mix(in_srgb,var(--ff-accent-primary)_16%,transparent)]"
      data-scroll-hint="true"
    >
      <span aria-hidden="true" className="h-2 w-2 rotate-45 border-b-2 border-l-2 border-[var(--ff-accent-primary)]" />
      <span aria-hidden="true" className="relative mx-2 h-px w-16 rounded-full bg-gradient-to-r from-transparent via-[var(--ff-accent-primary)] to-transparent">
        <span className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 rounded-[var(--ff-radius-full)] border border-white/40 bg-[var(--ff-accent-primary)] shadow-[0_0_14px_color-mix(in_srgb,var(--ff-accent-primary)_70%,transparent)]" />
      </span>
      <span aria-hidden="true" className="h-2 w-2 -rotate-45 border-b-2 border-r-2 border-[var(--ff-accent-primary)]" />
    </span>
  )
}

export function formatAlertWindow(alert: TumorMarkerRiseAlert) {
  return alert.points.map((point) => formatValue(point.value, point.unit)).join(' → ')
}
