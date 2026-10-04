/**
 * [INPUT]: 选中指标、图表范围/日期状态、主题及选择回调。
 * [OUTPUT]: LabTrendPanel：趋势工具栏、可拖动 SVG 与等价读数表。
 * [POS]: components/analytics 的趋势展示层，图表交互和 SVG 导出通过独立边界实现。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
import { Download } from 'lucide-react'
import { SectionSurface } from '@/components/system/surfaces'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { LabTimelineDragHint, monitorRowClass, scrollAreaClass } from './lab-analytics-controls'
import { formatValue, StatusLabel } from './lab-analytics-format'
import { exportLabChart } from './lab-chart-export'
import { LabTrendChart, timeLabelDisplayOptions } from './lab-trend-chart'
import type { LabAnalyticsState } from './use-lab-analytics'
import { useLabChartNavigation } from './use-lab-chart-navigation'

type Props = Pick<
  LabAnalyticsState,
  | 'chartScrollRef'
  | 'selectedRow'
  | 'showStatusText'
  | 'timeLabelDisplay'
  | 'setTimeLabelDisplay'
  | 'setSelectedPointLimit'
  | 'effectivePointLimit'
  | 'latestSeriesYear'
  | 'latestYearPointLimit'
  | 'maxPointLimit'
  | 'highlightedRiseDates'
  | 'visibleSeriesPoints'
  | 'selectedPointDate'
  | 'setSelectedPointDate'
> & { theme: Theme }

export function LabTrendPanel({ theme, ...state }: Props) {
  const {
    chartScrollRef, selectedRow, showStatusText, timeLabelDisplay, setTimeLabelDisplay,
    setSelectedPointLimit, effectivePointLimit, latestSeriesYear, latestYearPointLimit,
    maxPointLimit, highlightedRiseDates, visibleSeriesPoints, selectedPointDate,
  } = state
  const {
    chartTableRef, isChartDragging, selectChartPoint, handleChartPointRowKeyDown,
    handleChartPointerDown, handleChartPointerMove, stopChartDragging,
    shouldSuppressChartPointSelect, handleChartKeyDown,
  } = useLabChartNavigation(state)

  return (
    <SectionSurface className="flex min-w-0 flex-col overflow-hidden p-4 sm:p-5 xl:h-[760px]" theme={theme} tone="panel">
      {selectedRow ? (
        <>
          <div className="mb-4 flex shrink-0 flex-col gap-3">
            <div>
              <h2 className="font-[var(--ff-font-display)] text-2xl font-black tracking-normal">{selectedRow.itemName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--ff-text-secondary)]">
                <span className="inline-flex items-center gap-1">
                  最新值
                  {formatValue(selectedRow.latestValue, selectedRow.unit)}
                </span>
                <span>·</span>
                <StatusLabel compact={!showStatusText} status={selectedRow.status} />
                <span>· 参考 {selectedRow.referenceRangeLabel}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--ff-text-muted)]">
              <div aria-label="选择时间点显示方式" className="inline-flex min-h-11 items-center overflow-hidden rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]">
                <span className="px-3 text-[var(--ff-text-muted)]">时间点：</span>
                {timeLabelDisplayOptions.map((option) => (
                  <button
                    aria-label={`时间点显示：${option.label}`}
                    aria-pressed={timeLabelDisplay === option.value}
                    className={cn(
                      'min-h-11 border-l border-[var(--ff-border-default)] px-3 font-bold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]',
                      timeLabelDisplay === option.value ? 'bg-[color-mix(in_srgb,var(--ff-accent-primary)_12%,transparent)] text-[var(--ff-accent-text)]' : null,
                    )}
                    key={option.value}
                    onClick={() => setTimeLabelDisplay(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div aria-label="选择趋势数据范围" className="inline-flex min-h-11 items-center overflow-hidden rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]">
                <label className="inline-flex min-h-11 items-center gap-2 px-3">
                  <span>最近</span>
                  <select
                    aria-label="选择趋势数据范围"
                    className="bg-transparent font-[var(--ff-font-mono)] text-[var(--ff-text-primary)] outline-none"
                    onChange={(event) => setSelectedPointLimit(Number(event.target.value))}
                    value={effectivePointLimit}
                  >
                    {Array.from({ length: maxPointLimit }, (_, index) => index + 1).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <span>次数据</span>
                </label>
                <button
                  className="min-h-11 border-l border-[var(--ff-border-default)] px-3 font-bold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]"
                  disabled={!latestSeriesYear}
                  onClick={() => setSelectedPointLimit(latestYearPointLimit)}
                  type="button"
                >
                  {latestSeriesYear ? `${latestSeriesYear} 年` : '无日期'}
                </button>
                <button
                  className="min-h-11 border-l border-[var(--ff-border-default)] px-3 font-bold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]"
                  onClick={() => setSelectedPointLimit(maxPointLimit)}
                  type="button"
                >
                  全部
                </button>
              </div>
              <button className="inline-flex min-h-11 items-center gap-1 rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-[var(--ff-text-secondary)] hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)] disabled:cursor-not-allowed disabled:opacity-50" disabled={visibleSeriesPoints.length < 2} onClick={() => exportLabChart(chartScrollRef.current?.querySelector<SVGSVGElement>('svg[aria-label="选中指标趋势折线图"]'), selectedRow.itemName)} type="button">
                <Download aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
                导出图表
              </button>
            </div>
          </div>
          <div className="relative shrink-0">
            <div
              aria-label="趋势图可横向滑动"
              className={cn(
                'h-[328px] w-full max-w-full overflow-x-auto overflow-y-hidden pb-2 outline-none focus-visible:ring-1 focus-visible:ring-[var(--ff-accent-primary)]',
                'select-none [touch-action:pan-y]',
                isChartDragging ? 'cursor-grabbing' : 'cursor-grab',
                scrollAreaClass,
              )}
              data-testid="lab-trend-chart-scroll"
              onKeyDown={handleChartKeyDown}
              onPointerCancel={stopChartDragging}
              onPointerDown={handleChartPointerDown}
              onPointerMove={handleChartPointerMove}
              onPointerUp={stopChartDragging}
              ref={chartScrollRef}
              tabIndex={0}
            >
              <LabTrendChart
                highlightedDates={highlightedRiseDates}
                onSelectDate={(date) => selectChartPoint(date, { scrollTable: true })}
                points={visibleSeriesPoints}
                selectedDate={selectedPointDate}
                shouldSuppressSelect={shouldSuppressChartPointSelect}
                timeLabelDisplay={timeLabelDisplay}
              />
            </div>
            <LabTimelineDragHint />
          </div>
          <div className={cn('mt-4 min-h-0 flex-1 overflow-auto', scrollAreaClass)} ref={chartTableRef}>
            <table className="min-w-full border-collapse text-left text-sm" data-testid="lab-chart-equivalent-table">
              <thead className="sticky top-0 z-10 bg-[var(--ff-surface-panel)] text-sm font-semibold text-[var(--ff-text-muted)]">
                <tr className="border-b border-[var(--ff-border-default)]">
                  <th className="py-2 pr-3">日期</th>
                  <th className="py-2 pr-3">数值</th>
                  <th className="py-2 pr-3">参考范围</th>
                  <th className="py-2 pr-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {visibleSeriesPoints.map((point) => (
                  <tr
                    aria-label={`定位到 ${point.date} 的趋势点`}
                    aria-pressed={selectedPointDate === point.date}
                    className={cn('border-b border-[var(--ff-border-default)]', monitorRowClass, selectedPointDate === point.date ? 'bg-[color-mix(in_srgb,var(--ff-accent-primary)_10%,transparent)]' : null)}
                    key={`${point.date}-${point.value}`}
                    data-chart-row-date={point.date}
                    onClick={() => selectChartPoint(point.date, { scrollChart: true })}
                    onKeyDown={(event) => handleChartPointRowKeyDown(event, point.date)}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="py-2 pr-3">{point.date}</td>
                    <td className="py-2 pr-3">
                      {formatValue(point.value, point.unit)}
                    </td>
                    <td className="py-2 pr-3">{point.referenceRangeLabel}</td>
                    <td className="py-2 pr-3"><StatusLabel compact={!showStatusText} status={point.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex min-h-[360px] items-center justify-center text-sm font-semibold text-[var(--ff-text-secondary)]">该分类暂无已保存读数</div>
      )}
    </SectionSurface>
  )
}
