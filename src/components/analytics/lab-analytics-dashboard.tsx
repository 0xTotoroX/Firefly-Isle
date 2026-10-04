/**
 * [INPUT]: 统计页读数/加载状态、主题和各指标展示模块。
 * [OUTPUT]: LabAnalyticsDashboard，组合加载/错误/空态、摘要、指标选择、趋势和监测。
 * [POS]: components/analytics 的统计页入口，临床计算留在 lib，页面状态与交互下沉到各职责模块。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import { PanelSurface } from '@/components/system/surfaces'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { LabResult } from '@/types/patient'
import { SummaryCard } from './lab-analytics-controls'
import { LabIndicatorList } from './lab-indicator-list'
import { LabMonitorPanels } from './lab-monitor-panels'
import { LabTrendPanel } from './lab-trend-panel'
import { useLabAnalytics } from './use-lab-analytics'

type LabAnalyticsDashboardProps = {
  isLoading?: boolean
  labResults: LabResult[]
  loadError?: string | null
  onRetry?: () => void
  uploadHref?: string
  theme: Theme
}

export function LabAnalyticsDashboard({ isLoading = false, labResults, loadError = null, onRetry, uploadHref = '/app', theme }: LabAnalyticsDashboardProps) {
  const state = useLabAnalytics(labResults)
  const { abnormalCount, coveredCount, missingReferenceCount, riseAlerts, hasData, showStatusText, setShowStatusText } = state

  if (isLoading) {
    return <PanelSurface className="p-5 text-sm" theme={theme}><p role="status">正在读取指标数据…</p></PanelSurface>
  }
  if (loadError) {
    return <PanelSurface className="p-5 text-sm" theme={theme} tone="warning"><p role="alert">{loadError}</p>{onRetry ? <button className="mt-3 min-h-[44px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 font-semibold" onClick={onRetry} type="button">重试读取指标</button> : null}</PanelSurface>
  }

  return (
    <div className="flex min-h-0 flex-col gap-4" data-testid="lab-analytics-dashboard">
      <div className="flex min-h-7 flex-col gap-2 text-sm font-semibold text-[var(--ff-text-secondary)] md:flex-row md:items-center md:justify-between">
        <h1 className="sr-only">指标管理</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div aria-label="选择全局状态显示方式" className="inline-flex min-h-11 items-center overflow-hidden rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]">
            <span className="px-2 text-sm text-[var(--ff-text-muted)]">状态：</span>
            {[
              { label: '显示', value: true },
              { label: '隐藏', value: false },
            ].map((option) => (
              <button
                aria-label={`状态文字显示：${option.label}`}
                aria-pressed={showStatusText === option.value}
                className={cn(
                  'min-h-11 border-l border-[var(--ff-border-default)] px-2.5 text-sm font-bold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]',
                  showStatusText === option.value ? 'bg-[color-mix(in_srgb,var(--ff-accent-primary)_12%,transparent)] text-[var(--ff-accent-text)]' : null,
                )}
                key={option.label}
                onClick={() => setShowStatusText(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
        <SummaryCard Icon={AlertCircle} label="最近一次异常指标" tone={abnormalCount > 0 ? 'alert' : 'safe'} value={`${abnormalCount} 项`} />
        <SummaryCard Icon={TrendingUp} label="肿瘤标志物连续两次攀升 >20%" tone={riseAlerts.length > 0 ? 'alert' : 'safe'} value={`${riseAlerts.length} 项`} />
        <SummaryCard Icon={CheckCircle2} label="覆盖指标 / 缺参考" tone="safe" value={`${coveredCount} / ${missingReferenceCount}`} />
      </div>

      {!hasData ? (
        <PanelSurface className="p-8 text-center" theme={theme} tone="panel">
          <div className="font-[var(--ff-font-display)] text-2xl font-black tracking-normal">暂无已保存指标</div>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--ff-text-secondary)]">请在工作台上传血常规、血生化或肿瘤标志物报告，复核并保存后，可在这里查看指标变化。</p>
          <Link className="mt-4 inline-flex min-h-[44px] items-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold" to={uploadHref}>上传化验报告</Link>
        </PanelSurface>
      ) : (
        <div className="grid gap-4">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
            <LabIndicatorList {...state} theme={theme} />
            <LabTrendPanel {...state} theme={theme} />
          </div>
          <LabMonitorPanels {...state} theme={theme} />
        </div>
      )}
      <PanelSurface className="shrink-0 p-3 text-sm leading-6 text-[var(--ff-text-secondary)]" theme={theme} tone="inset">
        仅作趋势提示：本页只基于已保存的指标读数提供复核线索，不提供诊断、疾病进展结论、用药或治疗建议。
      </PanelSurface>
    </div>
  )
}
