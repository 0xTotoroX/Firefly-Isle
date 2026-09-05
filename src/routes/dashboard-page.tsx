/**
 * [INPUT]: 依赖 react-router-dom 的 Link，依赖 @/components/app-shell 的 V3 壳层、@/components/system 的 surfaces，依赖 async-resource 的加载基元、dashboard-data 的聚合数据、copy 字典、locale/theme 与 theme tokens。
 * [OUTPUT]: 对外提供 DashboardPage 组件，对应 /dashboard。
 * [POS]: routes 的登录后总览 orchestration 层，展示真实计数（病历/读数/活跃分享/AI 次数）、最近病历与最近异常读数；空态给可执行动作，不加装饰性假数据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Link } from 'react-router-dom'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { MainShell } from '@/components/system/surfaces'
import { useAsyncResource } from '@/lib/async-resource'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { useTheme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import { loadDashboardData } from '@/lib/dashboard-data'

const STAT_EYEBROW_CLASS =
  'font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]'
const STAT_VALUE_CLASS =
  'mt-2 whitespace-nowrap text-[clamp(2rem,4vw,3.25rem)] font-black leading-none tracking-normal text-[var(--ff-text-primary)]'

function DashboardStat({ eyebrow, index, label, value }: { eyebrow: string; index: number; label: string; value: string }) {
  return (
    <div className="relative min-h-[104px] overflow-hidden rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-4 py-4 sm:px-5">
      <div className="grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
        <span className={`${STAT_EYEBROW_CLASS} sm:justify-self-start`}>{String(index).padStart(2, '0')}</span>
        <div className="min-w-0">
          <div className="truncate whitespace-nowrap text-sm font-semibold text-[var(--ff-text-secondary)]">{label}</div>
          <div className={`${STAT_EYEBROW_CLASS} mt-0.5 truncate`}>{eyebrow}</div>
        </div>
        <div className={`${STAT_VALUE_CLASS} col-span-3 justify-self-start sm:col-span-1 sm:justify-self-end`}>{value}</div>
      </div>
    </div>
  )
}

function DashboardPageContent() {
  const { locale } = useLocale()
  const resource = useAsyncResource(() => loadDashboardData(), [])

  if (resource.error) {
    return (
      <p className="mt-4 rounded-[var(--ff-radius-md)] border px-4 py-3 text-sm text-[var(--ff-text-secondary)]" role="alert">
        {getCopy(copy.dashboard.loadFailed, locale)}
      </p>
    )
  }

  if (resource.isLoading || !resource.data) {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" role="status" aria-label={getCopy(copy.dashboard.title, locale)}>
        {[1, 2, 3, 4].map((key) => (
          <div className="min-h-[104px] animate-pulse rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]" key={key} />
        ))}
      </div>
    )
  }

  const data = resource.data

  if (data.patientCount === 0) {
    return (
      <section className="mt-6 rounded-[var(--ff-radius-lg)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-8 text-center md:p-12">
        <div className={`${STAT_EYEBROW_CLASS}`}>{getCopy(copy.dashboard.eyebrow, locale)}</div>
        <h2 className="mt-3 font-[var(--ff-font-display)] text-3xl font-black tracking-tight">
          {getCopy(copy.dashboard.emptyHeading, locale)}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--ff-text-secondary)]">
          {getCopy(copy.dashboard.emptyDescription, locale)}
        </p>
        <Link
          className="t-control-press mt-6 inline-flex min-h-[46px] items-center justify-center rounded-[14px] bg-[var(--ff-accent-primary)] px-6 text-base font-bold text-white transition-colors hover:bg-[var(--ff-accent-strong)]"
          to="/app"
        >
          {getCopy(copy.dashboard.emptyAction, locale)}
        </Link>
      </section>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat eyebrow="RECORDS" index={1} label={getCopy(copy.dashboard.statRecords, locale)} value={String(data.patientCount)} />
        <DashboardStat eyebrow="LAB RESULTS" index={2} label={getCopy(copy.dashboard.statReadings, locale)} value={String(data.labReadingCount)} />
        <DashboardStat eyebrow="ACTIVE SHARES" index={3} label={getCopy(copy.dashboard.statShares, locale)} value={String(data.activeShareCount)} />
        <DashboardStat eyebrow="AI · 30D" index={4} label={getCopy(copy.dashboard.statAiCalls, locale)} value={String(data.aiCallCount30d)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-5">
          <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal">{getCopy(copy.dashboard.latestRecordTitle, locale)}</h2>
          {data.latestRecord ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-[var(--ff-font-display)] text-lg font-bold">
                  {data.latestRecord.tumorType ?? getCopy(copy.dashboard.tumorTypeMissing, locale)}
                </div>
                {data.latestRecord.updatedAt ? (
                  <div className={`${STAT_EYEBROW_CLASS} mt-1`}>
                    {getCopy(copy.dashboard.updatedLabel, locale)} {data.latestRecord.updatedAt.slice(0, 10)}
                  </div>
                ) : null}
              </div>
              <Link
                className="t-control-press inline-flex min-h-[40px] items-center rounded-[12px] border border-[var(--ff-border-default)] px-4 text-sm font-bold text-[var(--ff-text-primary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-primary)]"
                to={`/record/${data.latestRecord.id}`}
              >
                {getCopy(copy.dashboard.viewRecord, locale)}
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--ff-text-muted)]">{getCopy(copy.dashboard.latestRecordEmpty, locale)}</p>
          )}
        </section>

        <section className="rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-5">
          <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal">{getCopy(copy.dashboard.abnormalTitle, locale)}</h2>
          {data.abnormalReadings.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ff-text-muted)]">{getCopy(copy.dashboard.abnormalEmpty, locale)}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.abnormalReadings.map((reading) => (
                <li className="flex flex-wrap items-center justify-between gap-2" key={reading.itemId}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-[var(--ff-radius-sm)] border px-1.5 py-0.5 font-[var(--ff-font-mono)] text-[10px] font-bold uppercase ${
                        reading.status === 'high'
                          ? 'border-[color-mix(in_srgb,var(--ff-critical)_46%,transparent)] text-[var(--ff-critical)]'
                          : 'border-[color-mix(in_srgb,var(--ff-low)_46%,transparent)] text-[var(--ff-low)]'
                      }`}
                    >
                      {reading.status === 'high' ? getCopy(copy.dashboard.highLabel, locale) : getCopy(copy.dashboard.lowLabel, locale)}
                    </span>
                    <span className="truncate text-sm font-bold text-[var(--ff-text-primary)]">{reading.itemName}</span>
                  </div>
                  <div className="flex items-center gap-3 font-[var(--ff-font-mono)] text-xs text-[var(--ff-text-secondary)]">
                    <span>
                      {reading.value}
                      {reading.unit ? ` ${reading.unit}` : ''}
                    </span>
                    {reading.reference ? <span className="text-[var(--ff-text-muted)]">ref {reading.reference}</span> : null}
                    <Link
                      className="font-semibold text-[var(--ff-accent-primary)] hover:underline"
                      to={`/analytics/${reading.patientId}`}
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
            <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal">{getCopy(copy.dashboard.recentSideEffectsTitle, locale)}</h2>
            {data.recentSideEffects.length > 0 && data.latestRecord ? (
              <Link
                className="t-control-press text-sm font-semibold text-[var(--ff-accent-primary)] hover:underline"
                to={`/record/${data.recentSideEffects[0].patientId}/side-effects`}
              >
                {getCopy(copy.dashboard.viewSideEffects, locale)}
              </Link>
            ) : null}
          </div>
          {data.recentSideEffects.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ff-text-muted)]">{getCopy(copy.dashboard.recentSideEffectsEmpty, locale)}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.recentSideEffects.map((entry) => (
                <li className="flex flex-wrap items-center justify-between gap-2" key={entry.id}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-[var(--ff-radius-sm)] border px-1.5 py-0.5 font-[var(--ff-font-mono)] text-[10px] font-bold uppercase ${
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
                    <span className="truncate text-sm font-bold text-[var(--ff-text-primary)]">{entry.symptom}</span>
                    {entry.overdue ? (
                      <span className="inline-flex items-center rounded-[var(--ff-radius-sm)] border border-[color-mix(in_srgb,var(--ff-critical)_46%,transparent)] px-1.5 py-0.5 font-[var(--ff-font-mono)] text-[10px] font-bold text-[var(--ff-critical)]">
                        {getCopy(copy.sideEffects.overdueBadge, locale)}
                      </span>
                    ) : entry.ongoing ? <span className="font-[var(--ff-font-mono)] text-[10px] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.ongoing, locale)}</span> : null}
                  </div>
                  <Link
                    className="font-[var(--ff-font-mono)] text-xs text-[var(--ff-text-muted)] hover:text-[var(--ff-accent-primary)]"
                    to={`/record/${entry.patientId}/side-effects`}
                  >
                    {getCopy(copy.sideEffects.openFromRecord, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
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
          <div className={STAT_EYEBROW_CLASS}>{getCopy(copy.dashboard.eyebrow, locale)}</div>
          <h1 className="mt-1 font-[var(--ff-font-display)] text-3xl font-black tracking-tight">{getCopy(copy.dashboard.title, locale)}</h1>
          <DashboardPageContent />
        </div>
      </MainShell>
    </div>
  )
}
