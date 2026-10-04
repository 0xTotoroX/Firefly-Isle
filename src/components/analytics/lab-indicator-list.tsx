/**
 * [INPUT]: 分类、搜索、可见趋势指标和选择回调。
 * [OUTPUT]: LabIndicatorList：分类导航、可访问搜索与最新读数选择。
 * [POS]: components/analytics 的指标选择展示层，保留完整名称、日期和单位。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
import { SectionSurface } from '@/components/system/surfaces'
import { LAB_CATEGORY_LABELS } from '@/lib/labs/lab-dictionary'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { categories, scrollAreaClass } from './lab-analytics-controls'
import { formatValue, StatusLabel } from './lab-analytics-format'
import type { LabAnalyticsState } from './use-lab-analytics'

type Props = Pick<
  LabAnalyticsState,
  | 'activeCategory'
  | 'indicatorSearch'
  | 'visibleRows'
  | 'selectedRow'
  | 'showStatusText'
  | 'selectCategory'
  | 'selectIndicator'
  | 'setIndicatorSearch'
> & { theme: Theme }

export function LabIndicatorList({ activeCategory, indicatorSearch, visibleRows, selectedRow, showStatusText, selectCategory, selectIndicator, setIndicatorSearch, theme }: Props) {
  return (
    <SectionSurface className="flex min-h-[520px] flex-col p-4 xl:h-[760px] xl:min-h-0 xl:overflow-hidden" theme={theme} tone="panel">
      <div aria-label="指标分类" className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            aria-pressed={activeCategory === category}
            className={cn(
              'min-h-11 shrink-0 rounded-[var(--ff-radius-sm)] border px-3 text-sm font-bold tracking-normal',
              activeCategory === category
                ? 'border-[var(--ff-accent-primary)] bg-[color-mix(in_srgb,var(--ff-accent-primary)_14%,transparent)] text-[var(--ff-accent-text)]'
                : 'border-[var(--ff-border-default)] text-[var(--ff-text-secondary)]',
            )}
            key={category}
            onClick={() => selectCategory(category)}
            type="button"
          >
            {LAB_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>
      <label className="mt-3 flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 text-sm focus-within:border-[var(--ff-accent-primary)]">
        <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[var(--ff-text-muted)]">search</span>
        <input
          aria-label="搜索指标名称"
          className="min-w-0 flex-1 bg-transparent text-[var(--ff-text-primary)] outline-none placeholder:text-[var(--ff-text-muted)]"
          data-testid="lab-indicator-search"
          onChange={(event) => setIndicatorSearch(event.target.value)}
          placeholder="搜索指标名称"
          value={indicatorSearch}
        />
      </label>
      <div className={cn('mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1', scrollAreaClass)}>
        {visibleRows.length > 0 ? (
          visibleRows.map((row) => (
            <button
              className={cn(
                'flex min-h-[56px] w-full flex-wrap items-center justify-between gap-3 rounded-[var(--ff-radius-sm)] border px-3 py-2 text-left',
                selectedRow?.itemCode === row.itemCode
                ? 'border-[var(--ff-accent-primary)] bg-[color-mix(in_srgb,var(--ff-accent-primary)_8%,transparent)] shadow-[inset_3px_0_0_var(--ff-accent-primary)]'
                : 'border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]',
              )}
              key={`${row.category}:${row.itemCode}`}
              data-lab-indicator-category={row.category}
              data-lab-indicator-code={row.itemCode}
              onClick={() => selectIndicator(row.category, row.itemCode)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[var(--ff-text-primary)]">{row.itemName}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--ff-text-muted)]">
                  <span>{row.latestDate ?? '缺日期'}</span>
                  <span>·</span>
                  <StatusLabel compact={!showStatusText} status={row.status} />
                </span>
              </span>
              <span className="shrink-0 text-right font-[var(--ff-font-mono)] text-sm text-[var(--ff-text-primary)]">
                {formatValue(row.latestValue, row.unit)}
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-4 text-sm font-semibold text-[var(--ff-text-secondary)]">没有匹配的指标</div>
        )}
      </div>
    </SectionSurface>

  )
}
