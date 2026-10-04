/**
 * [INPUT]: 调用方提供的病历摘要、目标链接、分页状态与操作，依赖 locale/copy 和 React Router Link。
 * [OUTPUT]: PatientRecordList，显示姓名、病种、更新时间与病历/指标/录入入口。
 * [POS]: 可注入真实或 Demo 数据的纯展示列表；不读取身份、Supabase 或全量病历正文。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { Link } from 'react-router-dom'
import { copy, getCopy } from '@/lib/copy'
import type { Locale } from '@/lib/locale'
import type { PatientRecordSummary } from '@/lib/patient-record-storage'

export type PatientRecordListItem = PatientRecordSummary & {
  recordHref: string
  analyticsHref: string
  intakeHref: string
}

type PatientRecordListProps = {
  records: PatientRecordListItem[]
  locale: Locale
  isLoading: boolean
  hasError: boolean
  hasMore: boolean
  onLoadMore: () => void
  onRetry: () => void
  emptyActionHref?: string
}

const actionClass = 'inline-flex min-h-[44px] items-center rounded-[var(--ff-radius-sm)] px-3 text-sm font-semibold text-[var(--ff-accent-text)] hover:bg-[var(--ff-surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ff-accent-text)]'

export function PatientRecordList({ records, locale, isLoading, hasError, hasMore, onLoadMore, onRetry, emptyActionHref = '/app' }: PatientRecordListProps) {
  return (
    <section aria-labelledby="records-heading" className="scroll-mt-24 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-5" id="records">
      <h2 className="font-[var(--ff-font-display)] text-xl font-bold" id="records-heading">{getCopy(copy.dashboard.recordsTitle, locale)}</h2>
      {records.length > 0 ? (
        <ul className="mt-2 divide-y divide-[var(--ff-border-default)]">
          {records.map((record) => (
            <li className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4" key={record.id}>
              <div className="min-w-0 flex-1 basis-56 break-words">
                <h3 className="text-base font-semibold">{record.name?.trim() || getCopy(copy.dashboard.recordNameMissing, locale)}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--ff-text-secondary)]">{record.tumorType?.trim() || getCopy(copy.dashboard.recordTumorTypeMissing, locale)}</p>
                <p className="mt-1 text-sm text-[var(--ff-text-secondary)]">{getCopy(copy.dashboard.updatedLabel, locale)} <time dateTime={record.updatedAt}>{new Date(record.updatedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</time></p>
              </div>
              <nav aria-label={record.name?.trim() || getCopy(copy.dashboard.recordNameMissing, locale)} className="-mx-3 flex shrink-0 flex-wrap gap-1">
                <Link className={actionClass} to={record.recordHref}>{getCopy(copy.dashboard.viewRecord, locale)}</Link>
                <Link className={actionClass} to={record.analyticsHref}>{getCopy(copy.dashboard.viewAnalytics, locale)}</Link>
                <Link className={actionClass} to={record.intakeHref}>{getCopy(copy.dashboard.continueIntake, locale)}</Link>
              </nav>
            </li>
          ))}
        </ul>
      ) : !isLoading && !hasError ? (
        <div className="py-6">
          <h3 className="text-lg font-semibold">{getCopy(copy.dashboard.emptyHeading, locale)}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.dashboard.emptyDescription, locale)}</p>
          <Link className={`${actionClass} mt-3 -ml-3`} to={emptyActionHref}>{getCopy(copy.dashboard.emptyAction, locale)}</Link>
        </div>
      ) : null}
      {hasError ? (
        <div className="mt-4 flex flex-wrap items-center gap-3" role="alert">
          <p className="text-sm leading-6">{getCopy(records.length ? copy.dashboard.recordsMoreFailed : copy.dashboard.recordsLoadFailed, locale)}</p>
          <button className={actionClass} disabled={isLoading} onClick={onRetry} type="button">{getCopy(copy.dashboard.recordsRetry, locale)}</button>
        </div>
      ) : null}
      {isLoading ? <p className="mt-4 text-sm text-[var(--ff-text-secondary)]" role="status">{getCopy(copy.dashboard.recordsLoading, locale)}</p> : null}
      {hasMore && !hasError ? <button className={`${actionClass} mt-3 border border-[var(--ff-border-default)] disabled:opacity-60`} disabled={isLoading} onClick={onLoadMore} type="button">{getCopy(copy.dashboard.recordsLoadMore, locale)}</button> : null}
    </section>
  )
}
