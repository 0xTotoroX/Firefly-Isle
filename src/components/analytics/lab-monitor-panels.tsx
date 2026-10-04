/**
 * [INPUT]: 最近异常读数、连续上涨提醒、选择回调和主题。
 * [OUTPUT]: LabMonitorPanels：异常表与上涨提醒表，支持键盘回选对应趋势。
 * [POS]: components/analytics 的只读监测展示层，复用已有计算结果，不推导诊断。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
import type { KeyboardEvent } from 'react'
import { SectionSurface } from '@/components/system/surfaces'
import { LAB_CATEGORY_LABELS } from '@/lib/labs/lab-dictionary'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { LabResultCategory } from '@/types/patient'
import { formatAlertWindow, monitorRowClass, scrollAreaClass } from './lab-analytics-controls'
import { formatRatio, formatValue, RiseRatioLabel, StatusLabel } from './lab-analytics-format'
import type { LabAnalyticsState } from './use-lab-analytics'

type Props = Pick<
  LabAnalyticsState,
  | 'abnormalReadings'
  | 'riseAlerts'
  | 'highlightedRiseWindow'
  | 'showStatusText'
  | 'selectIndicator'
  | 'selectRiseAlert'
> & { theme: Theme }

export function LabMonitorPanels({ abnormalReadings, riseAlerts, highlightedRiseWindow, showStatusText, selectIndicator, selectRiseAlert, theme }: Props) {
  function handleMonitorRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, category: LabResultCategory, itemCode: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    selectIndicator(category, itemCode, true)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionSurface className="min-h-[360px] p-4 sm:p-5" theme={theme} tone="panel">
        <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal">最近异常读数</h2>
        <div className={cn('mt-4 overflow-x-auto', scrollAreaClass)}>
          {abnormalReadings.length > 0 ? (
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--ff-surface-panel)] text-sm font-semibold text-[var(--ff-text-muted)]">
                <tr className="border-b border-[var(--ff-border-default)]">
                  <th className="py-2 pr-3">指标</th>
                  <th className="py-2 pr-3">数值</th>
                  <th className="py-2 pr-3">参考范围</th>
                  <th className="py-2 pr-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {abnormalReadings.map((reading) => (
                  <tr
                    aria-label={`查看 ${LAB_CATEGORY_LABELS[reading.category]} ${reading.itemName} 趋势图`}
                    className={cn('border-b border-[var(--ff-border-default)]', monitorRowClass)}
                    key={`${reading.category}:${reading.itemCode}:${reading.testDate}`}
                    onClick={() => selectIndicator(reading.category, reading.itemCode, true)}
                    onKeyDown={(event) => handleMonitorRowKeyDown(event, reading.category, reading.itemCode)}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="py-2 pr-3">{LAB_CATEGORY_LABELS[reading.category]} · {reading.itemName}</td>
                    <td className="py-2 pr-3">
                      {formatValue(reading.value, reading.unit)}
                    </td>
                    <td className="py-2 pr-3">{reading.referenceRangeLabel}</td>
                    <td className="py-2 pr-3"><StatusLabel compact={!showStatusText} status={reading.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-3 text-sm font-semibold text-[var(--ff-text-secondary)]">当前最近一次检查未发现可计算异常指标</div>
          )}
        </div>
      </SectionSurface>

      <SectionSurface className="min-h-[360px] p-4 sm:p-5" theme={theme} tone="panel">
        <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal text-[var(--ff-accent-text)]">肿瘤标志物连续上涨提醒</h2>
        <div className={cn('mt-4 overflow-x-auto', scrollAreaClass)}>
          {riseAlerts.length > 0 ? (
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--ff-surface-panel)] text-sm font-semibold text-[var(--ff-text-muted)]">
                <tr className="border-b border-[var(--ff-border-default)]">
                  <th className="py-2 pr-3">指标</th>
                  <th className="py-2 pr-3">最近三次结果</th>
                  <th className="py-2 pr-3">连续上涨</th>
                  <th className="py-2 pr-3">累计上涨</th>
                </tr>
              </thead>
              <tbody>
                {riseAlerts.map((alert) => (
                  <tr
                    aria-label={`查看 肿瘤标志物 ${alert.itemName} 趋势图并标出连续上涨段`}
                    className={cn(
                      'border-b border-[var(--ff-border-default)]',
                      monitorRowClass,
                      highlightedRiseWindow?.itemCode === alert.itemCode ? 'bg-[color-mix(in_srgb,var(--ff-critical)_10%,transparent)]' : null,
                    )}
                    key={alert.itemCode}
                    data-rise-alert-code={alert.itemCode}
                    onClick={() => selectRiseAlert(alert)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') {
                        return
                      }

                      event.preventDefault()
                      selectRiseAlert(alert)
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="py-2 pr-3">{alert.itemName}</td>
                    <td className="py-2 pr-3">{formatAlertWindow(alert)}</td>
                    <td className="py-2 pr-3"><RiseRatioLabel>{`${formatRatio(alert.intervalRiseRatios[0])} → ${formatRatio(alert.intervalRiseRatios[1])}`}</RiseRatioLabel></td>
                    <td className="py-2 pr-3"><RiseRatioLabel>{formatRatio(alert.cumulativeRiseRatio)}</RiseRatioLabel></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-3 text-sm font-semibold text-[var(--ff-text-secondary)]">暂无满足连续两次上涨超过 20% 的肿瘤标志物</div>
          )}
        </div>
      </SectionSurface>
    </div>
  )
}
