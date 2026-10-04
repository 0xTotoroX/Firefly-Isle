/**
 * [INPUT]: 依赖 @/lib/lab-results 的 buildLabTrendRows，依赖 @/lib/locale 的 Locale 与 @/types/patient 的 PatientRecord。
 * [OUTPUT]: 对外提供 LabTrendsTable 组件。
 * [POS]: components/record 的实验室趋势展示层，为 /record/:id dossier 增加非诊断性趋势辅助信息。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { buildLabTrendRows, type LabTrendStatus } from '@/lib/lab-results'
import type { Locale } from '@/lib/locale'
import type { PatientRecord } from '@/types/patient'

const copy = {
  en: {
    date: 'Latest date',
    empty: 'No lab trends yet',
    item: 'Indicator',
    latest: 'Latest value',
    range: 'Reference',
    readingCount: 'Readings',
    statuses: {
      high: 'High',
      low: 'Low',
      normal: 'Normal',
      'persistent-high': 'Persistent elevation',
      'reference-missing': 'Reference needed',
    },
    title: 'Lab trends',
    undated: 'undated',
  },
  zh: {
    date: '最近日期',
    empty: '暂无实验室趋势',
    item: '指标',
    latest: '最新值',
    range: '参考范围',
    readingCount: '读数',
    statuses: {
      high: '偏高',
      low: '偏低',
      normal: '正常',
      'persistent-high': '持续增高',
      'reference-missing': '需补参考',
    },
    title: '实验室趋势',
    undated: '无日期',
  },
} satisfies Record<Locale, {
  date: string
  empty: string
  item: string
  latest: string
  range: string
  readingCount: string
  statuses: Record<LabTrendStatus, string>
  title: string
  undated: string
}>

function getStatusClass(status: LabTrendStatus) {
  if (status === 'persistent-high') {
    return 'border-[var(--ff-critical)] bg-[var(--ff-surface-warning)] text-[var(--ff-critical)]'
  }

  if (status === 'high') return 'border-[var(--ff-critical)] text-[var(--ff-critical)]'
  if (status === 'low') return 'border-[var(--ff-low)] text-[var(--ff-low)]'

  if (status === 'reference-missing') {
    return 'border-[var(--ff-border-default)] text-[var(--ff-text-muted)]'
  }

  return 'border-[color:color-mix(in_srgb,var(--ff-accent-success)_35%,var(--ff-border-default))] text-[var(--ff-accent-success)]'
}

export function LabTrendsTable({ locale, record }: { locale: Locale; record: PatientRecord }) {
  const text = copy[locale]
  const rows = buildLabTrendRows(record.labResults ?? [])

  return (
    <section className="mt-10 border-t border-[var(--ff-border-default)] pt-7">
      <h2 className="mb-5 text-2xl font-semibold">{text.title}</h2>

      {rows.length === 0 ? (
        <div className="border-l-2 border-[var(--ff-border-default)] py-1 pl-4 text-sm font-semibold text-[var(--ff-text-secondary)]">
          {text.empty}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs uppercase tracking-normal text-[var(--ff-text-muted)]">
              <tr>
                <th className="border-b border-[var(--ff-border-default)] px-4 py-3">{text.item}</th>
                <th className="border-b border-[var(--ff-border-default)] px-4 py-3">{text.latest}</th>
                <th className="border-b border-[var(--ff-border-default)] px-4 py-3">{text.range}</th>
                <th className="border-b border-[var(--ff-border-default)] px-4 py-3">{text.date}</th>
                <th className="border-b border-[var(--ff-border-default)] px-4 py-3">{text.readingCount}</th>
                <th className="border-b border-[var(--ff-border-default)] px-4 py-3">{locale === 'zh' ? '状态' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="align-top" key={row.itemCode}>
                  <td className="border-b border-[var(--ff-border-muted)] px-4 py-4 font-semibold">{row.itemName}</td>
                  <td className="border-b border-[var(--ff-border-muted)] px-4 py-4">
                    {row.latestValue}
                    {row.unit ? ` ${row.unit}` : ''}
                  </td>
                  <td className="border-b border-[var(--ff-border-muted)] px-4 py-4">{row.referenceRangeLabel}</td>
                  <td className="border-b border-[var(--ff-border-muted)] px-4 py-4">{row.latestDate ?? text.undated}</td>
                  <td className="border-b border-[var(--ff-border-muted)] px-4 py-4">
                    {row.readingCount}
                    {row.undatedCount > 0 ? ` / ${row.undatedCount} ${text.undated}` : ''}
                  </td>
                  <td className="border-b border-[var(--ff-border-muted)] px-4 py-4">
                    <span className={`inline-flex rounded-[var(--ff-radius-full)] border px-3 py-1 font-semibold ${getStatusClass(row.status)}`}>
                      {text.statuses[row.status]}
                    </span>
                    {row.trendWarning ? <p className="mt-2 max-w-[260px] text-xs leading-5 text-[var(--ff-text-secondary)]">{row.trendWarning}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
