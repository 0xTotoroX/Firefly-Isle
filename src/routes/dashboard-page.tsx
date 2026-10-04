/**
 * [INPUT]: 依赖 React Router、V3 壳层、认证状态、dashboard-data 聚合数据、patient-record-storage 摘要分页与纯展示 PatientRecordList。
 * [OUTPUT]: 对外提供 DashboardPage 组件，对应 /dashboard。
 * [POS]: 登录后总览；账号 key 隔离分页，请求开始由事件/初始状态表达，回复与失败在异步回调更新。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { PatientRecordList } from '@/components/record/patient-record-list'
import { RecordLoadFeedback } from '@/components/record/record-load-feedback'
import { MainShell } from '@/components/system/surfaces'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { getDemoDashboard, useDemoSession, useProductPath } from '@/lib/demo-session'
import { useOptionalAuth } from '@/lib/auth'
import { loadPatientRecordSummaries, type PatientRecordCursor, type PatientRecordSummary } from '@/lib/records/patient-record-storage'
import { useAsyncResource } from '@/lib/async-resource'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { useTheme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import { loadDashboardData, type DashboardData } from '@/lib/dashboard-data'

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--ff-radius-md)] bg-[var(--ff-surface-inset)] p-4 sm:p-5">
      <p className="text-sm leading-6 text-[var(--ff-text-secondary)]">{label}</p>
      <p className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-none tabular-nums text-[var(--ff-text-primary)]">{value}</p>
    </div>
  )
}

function DashboardSummary({ data, onRetry }: { data: DashboardData; onRetry: () => void }) {
  const { locale } = useLocale()
  const productPath = useProductPath()
  if (data.patientCount === 0) return null
  return (
    <>
      {data.unavailableSections.includes('followUp') ? <RecordLoadFeedback isLoading={false} message={`${getCopy(copy.followUp.title, locale)}：${getCopy(copy.dashboard.sectionUnavailable, locale)}`} onRetry={onRetry} /> : null}
      {data.nextVisit ? (
        <Link
          className="t-control-press flex flex-wrap items-center justify-between gap-3 rounded-[var(--ff-radius-md)] bg-[color-mix(in_srgb,var(--ff-accent-primary)_10%,var(--ff-surface-panel))] px-5 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--ff-accent-primary)_16%,var(--ff-surface-panel))]"
          data-testid="dashboard-next-visit"
          to={productPath(`/record/${data.nextVisit.patientId}/follow-up`)}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-[var(--ff-accent-text)]">event_repeat</span>
            <span className="text-sm font-bold text-[var(--ff-text-primary)]">{getCopy(copy.followUp.nextVisitPrefix, locale)}</span>
            <span className="font-[var(--ff-font-mono)] text-sm text-[var(--ff-text-secondary)]">{data.nextVisit.nextVisitOn}</span>
          </div>
          <span className="font-[var(--ff-font-display)] text-2xl font-semibold text-[var(--ff-accent-text)]">
            {data.nextVisit.daysUntil < 0 ? `${getCopy(copy.dashboard.visitDue, locale)} · ${Math.abs(data.nextVisit.daysUntil)} ${locale === 'zh' ? '天' : 'days'}` : data.nextVisit.daysUntil === 0 ? getCopy(copy.dashboard.visitToday, locale) : `${data.nextVisit.daysUntil} ${getCopy(copy.followUp.daysUntil, locale)}`}
          </span>
        </Link>
      ) : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DashboardStat label={getCopy(copy.dashboard.statRecords, locale)} value={String(data.patientCount)} />
        <DashboardStat label={getCopy(copy.dashboard.statReadings, locale)} value={String(data.labReadingCount)} />
        <DashboardStat label={getCopy(copy.dashboard.statShares, locale)} value={String(data.activeShareCount)} />
        <DashboardStat label={getCopy(copy.dashboard.statAiCalls, locale)} value={data.aiCallCount30d === null ? '—' : String(data.aiCallCount30d)} />
      </div>

      {data.unavailableSections.includes('usage') ? <RecordLoadFeedback isLoading={false} message={`${getCopy(copy.dashboard.statAiCalls, locale)}：${getCopy(copy.dashboard.sectionUnavailable, locale)}`} onRetry={onRetry} /> : null}
    </>
  )
}

function DashboardClinicalSections({ data, onRetry }: { data: DashboardData; onRetry: () => void }) {
  const { locale } = useLocale()
  const productPath = useProductPath()
  if (data.patientCount === 0) return null
  return (
    <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-5">
          <h2 className="font-[var(--ff-font-display)] text-xl font-semibold tracking-normal">{getCopy(copy.dashboard.abnormalTitle, locale)}</h2>
          {data.unavailableSections.includes('labs') ? <RecordLoadFeedback isLoading={false} message={getCopy(copy.dashboard.sectionUnavailable, locale)} onRetry={onRetry} /> : data.abnormalReadings.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ff-text-muted)]">{getCopy(copy.dashboard.abnormalEmpty, locale)}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.abnormalReadings.map((reading) => (
                <li className="flex flex-wrap items-center justify-between gap-2" key={reading.itemId}>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-[var(--ff-radius-sm)] border px-1.5 py-0.5 font-[var(--ff-font-mono)] text-sm font-semibold ${
                        reading.status === 'high'
                          ? 'border-[color-mix(in_srgb,var(--ff-critical)_46%,transparent)] text-[var(--ff-critical)]'
                          : 'border-[color-mix(in_srgb,var(--ff-low)_46%,transparent)] text-[var(--ff-low)]'
                      }`}
                    >
                      {reading.status === 'high' ? getCopy(copy.dashboard.highLabel, locale) : getCopy(copy.dashboard.lowLabel, locale)}
                    </span>
                    <span className="min-w-0 break-words text-base font-semibold [overflow-wrap:anywhere] text-[var(--ff-text-primary)]">{reading.itemName}</span>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-[var(--ff-text-secondary)]">
                    <span>
                      {reading.value}
                      {reading.unit ? ` ${reading.unit}` : ''}
                    </span>
                    {reading.reference ? <span className="text-[var(--ff-text-muted)]">{locale === 'zh' ? '参考范围' : 'Reference'} {reading.reference}</span> : null}
                    <Link
                      className="inline-flex min-h-11 items-center font-semibold text-[var(--ff-accent-text)] hover:underline"
                      to={productPath(`/analytics/${reading.patientId}`)}
                    >
                      {getCopy(copy.dashboard.viewAnalytics, locale)}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[var(--ff-radius-md)] bg-[var(--ff-surface-panel)] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-[var(--ff-font-display)] text-xl font-semibold tracking-normal">{getCopy(copy.dashboard.recentSideEffectsTitle, locale)}</h2>
            {data.recentSideEffects.length > 0 ? (
              <Link
                className="t-control-press text-sm font-semibold text-[var(--ff-accent-text)] hover:underline"
                to={productPath(`/record/${data.recentSideEffects[0].patientId}/side-effects`)}
              >
                {getCopy(copy.dashboard.viewSideEffects, locale)}
              </Link>
            ) : null}
          </div>
          {data.unavailableSections.includes('symptoms') ? <RecordLoadFeedback isLoading={false} message={getCopy(copy.dashboard.sectionUnavailable, locale)} onRetry={onRetry} /> : data.recentSideEffects.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ff-text-muted)]">{getCopy(copy.dashboard.recentSideEffectsEmpty, locale)}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.recentSideEffects.map((entry) => (
                <li className="flex flex-wrap items-center justify-between gap-2" key={entry.id}>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-[var(--ff-radius-sm)] border px-1.5 py-0.5 font-[var(--ff-font-mono)] text-sm font-semibold ${
                        entry.severity === 'severe'
                          ? 'border-[color-mix(in_srgb,var(--ff-critical)_46%,transparent)] text-[var(--ff-critical)]'
                          : entry.severity === 'moderate'
                            ? 'border-[color-mix(in_srgb,var(--ff-accent-warning)_46%,transparent)] text-[var(--ff-accent-warning)]'
                            : 'border-[color-mix(in_srgb,var(--ff-low)_46%,transparent)] text-[var(--ff-low)]'
                      }`}
                    >
                      {entry.severity === 'severe'
                        ? getCopy(copy.sideEffects.severitySevere, locale)
                        : entry.severity === 'moderate'
                          ? getCopy(copy.sideEffects.severityModerate, locale)
                          : getCopy(copy.sideEffects.severityMild, locale)}
                    </span>
                    <span className="min-w-0 break-words text-base font-semibold [overflow-wrap:anywhere] text-[var(--ff-text-primary)]">{entry.symptom}</span>
                    {entry.overdue ? (
                      <span className="inline-flex items-center rounded-[var(--ff-radius-sm)] border border-[color-mix(in_srgb,var(--ff-critical)_46%,transparent)] px-1.5 py-0.5 font-[var(--ff-font-mono)] text-sm font-bold text-[var(--ff-critical)]">
                        {getCopy(copy.sideEffects.overdueBadge, locale)}
                      </span>
                    ) : entry.ongoing ? <span className="font-[var(--ff-font-mono)] text-sm text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.ongoing, locale)}</span> : null}
                  </div>
                  <Link
                    className="inline-flex min-h-11 items-center text-sm text-[var(--ff-text-muted)] hover:text-[var(--ff-accent-text)]"
                    to={productPath(`/record/${entry.patientId}/side-effects`)}
                  >
                    {getCopy(copy.sideEffects.openFromRecord, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
    </div>
  )
}

function DashboardRecords({ userId }: { userId: string }) {
  const { locale } = useLocale()
  const requestRef = useRef(0)
  const loadingRef = useRef(false)
  const [state, setState] = useState<{ records: PatientRecordSummary[]; cursor: PatientRecordCursor | null; isLoading: boolean; hasError: boolean }>({
    records: [], cursor: null, isLoading: true, hasError: false,
  })
  const requestPage = useCallback(async (cursor: PatientRecordCursor | null) => {
    if (loadingRef.current) return
    loadingRef.current = true
    const requestId = ++requestRef.current
    try {
      const page = await loadPatientRecordSummaries(userId, cursor)
      if (requestId !== requestRef.current) return
      setState((current) => ({ records: cursor ? [...current.records, ...page.records] : page.records, cursor: page.nextCursor, isLoading: false, hasError: false }))
    } catch {
      if (requestId === requestRef.current) setState((current) => ({ ...current, isLoading: false, hasError: true }))
    } finally {
      if (requestId === requestRef.current) loadingRef.current = false
    }
  }, [userId])
  function loadPage(cursor: PatientRecordCursor | null) {
    if (loadingRef.current) return
    setState((current) => ({ ...current, isLoading: true, hasError: false }))
    void requestPage(cursor)
  }
  useEffect(() => {
    loadingRef.current = true
    const requestId = ++requestRef.current
    void loadPatientRecordSummaries(userId, null)
      .then((page) => {
        if (requestId === requestRef.current) setState({ records: page.records, cursor: page.nextCursor, isLoading: false, hasError: false })
      })
      .catch(() => {
        if (requestId === requestRef.current) setState((current) => ({ ...current, isLoading: false, hasError: true }))
      })
      .finally(() => { if (requestId === requestRef.current) loadingRef.current = false })
    return () => { requestRef.current += 1; loadingRef.current = false }
  }, [userId])
  return (
    <PatientRecordList
      hasError={state.hasError}
      hasMore={state.cursor !== null}
      isLoading={state.isLoading}
      locale={locale}
      onLoadMore={() => void loadPage(state.cursor)}
      onRetry={() => void loadPage(state.cursor)}
      records={state.records.map((record) => ({ ...record, recordHref: `/record/${record.id}`, analyticsHref: `/analytics/${record.id}`, intakeHref: `/app?patient=${encodeURIComponent(record.id)}` }))}
    />
  )
}

function DashboardPageContent({ userId }: { userId: string }) {
  const { locale } = useLocale()
  const location = useLocation()
  const resource = useAsyncResource(() => loadDashboardData(), [userId])
  useEffect(() => {
    if (location.hash === '#records') document.getElementById('records')?.scrollIntoView?.({ block: 'start' })
  }, [location.key, location.hash, resource.isLoading])
  return (
    <div className="mt-6 space-y-4">
      {resource.error ? <RecordLoadFeedback isLoading={false} message={getCopy(copy.dashboard.loadFailed, locale)} onRetry={resource.reload} />
        : resource.data ? <DashboardSummary data={resource.data} onRetry={resource.reload} />
          : <RecordLoadFeedback isLoading message={getCopy(copy.dashboard.title, locale)} onRetry={resource.reload} />}
      <DashboardRecords userId={userId} />
      {resource.data ? <DashboardClinicalSections data={resource.data} onRetry={resource.reload} /> : null}
    </div>
  )
}


function DemoDashboardContent() {
  const demo = useDemoSession()!
  const { locale } = useLocale()
  const productPath = useProductPath()
  const data = getDemoDashboard(demo.state)
  return <div className="mt-6 space-y-4">
    <DemoModeBanner />
    <DashboardSummary data={data} onRetry={() => {}} />
    <PatientRecordList locale={locale} isLoading={false} hasError={false} hasMore={false} onRetry={() => {}} onLoadMore={() => {}} emptyActionHref={productPath('/app')} records={demo.state.records.map((record) => ({ id: record.id!, name: record.basicInfo?.name ?? null, tumorType: record.basicInfo?.tumorType ?? null, updatedAt: '2026-10-01T08:00:00Z', recordHref: productPath(`/record/${record.id}`), analyticsHref: productPath(`/analytics/${record.id}`), intakeHref: productPath(`/app?patient=${record.id}`) }))} />
    <DashboardClinicalSections data={data} onRetry={() => {}} />
  </div>
}

type DashboardPageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

export function DashboardPage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: DashboardPageProps) {
  const { locale } = useLocale()
  const { theme } = useTheme()
  const user = useOptionalAuth()?.user
  const demo = useDemoSession()
  const dark = theme === 'dark'

  return (
    <div className={dark ? 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]' : 'ff-light-record-bg min-h-screen text-[var(--ff-text-primary)]'}>
      <ClinicalTopBar theme={theme} title={getCopy(copy.dashboard.title, locale)} withRail />
      <ArchiveSideNav
        dark={dark}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        userIsAnonymous={userIsAnonymous}
        userLabel={userLabel}
      />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className={`${shellWideContentClass} t-route-reveal mt-5 md:mt-6`}>
          <h1 className="mt-1 font-[var(--ff-font-display)] text-3xl font-semibold tracking-tight">{getCopy(copy.dashboard.title, locale)}</h1>
          {demo ? <DemoDashboardContent /> : <DashboardPageContent key={user?.id} userId={user?.id ?? ''} />}
        </div>
      </MainShell>
    </div>
  )
}
