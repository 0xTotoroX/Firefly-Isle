/**
 * [INPUT]: 依赖 react-router-dom 的 useLocation/useParams，依赖 @/components/app-shell 的 V3 壳层、@/components/system 的 DemoModeBanner、@/components/analytics 的统计界面、demo lab fixture、async-resource 的共享加载基元、./demo-mode.logic 的可选公开分享码 Demo 数据源与 patient-record-storage 的按 id 病历读取。
 * [OUTPUT]: 对外提供 LabAnalyticsPage 组件，对应公开 /demo/analytics 与受保护 /analytics/:id、/analytics/demo，并在 Demo 模式显示提醒。
 * [POS]: routes 的指标管理统计 orchestration 层，负责按 Demo/真实路由 id 读取真实病历或可选 Supabase 公开 Demo 病历，并把 /analytics 收敛为只读指标展示；文件上传入口归 /app 输入区。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useLocation, useParams } from 'react-router-dom'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { demoLabAnalyticsRecord } from '@/components/analytics/demo-lab-analytics'
import { LabAnalyticsDashboard } from '@/components/analytics/lab-analytics-dashboard'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { MainShell } from '@/components/system/surfaces'
import { useAsyncResource } from '@/lib/async-resource'
import { useLocale } from '@/lib/locale'
import { getOnlineRequiredMessage, isOnlineRequiredError } from '@/lib/network-status'
import { loadPatientRecordById } from '@/lib/patient-record-storage'
import { useTheme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import type { PatientRecord } from '@/types/patient'

import { loadDemoPatientRecord } from './demo-mode.logic'

type LabAnalyticsPageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

type AnalyticsRecordSource = {
  found: boolean
  record: PatientRecord | null
}

function getAnalyticsLoadError(error: unknown, locale: 'zh' | 'en') {
  return isOnlineRequiredError(error) ? getOnlineRequiredMessage(locale) : '无法读取这份病历的指标数据，请稍后重试。'
}

export function LabAnalyticsPage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: LabAnalyticsPageProps) {
  const { id = 'demo' } = useParams()
  const location = useLocation()
  const { locale } = useLocale()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const publicDemoRoute = location.pathname.startsWith('/demo')
  const demoRoute = publicDemoRoute || id.trim() === 'demo'
  const resource = useAsyncResource<AnalyticsRecordSource>(
    () =>
      demoRoute
        ? loadDemoPatientRecord().then(({ record }) => ({ found: true, record }))
        : loadPatientRecordById(id).then((record) => ({ found: record !== null, record })),
    [demoRoute, id],
    demoRoute ? { found: true, record: demoLabAnalyticsRecord } : null,
  )

  const record = resource.data?.record ?? null
  const labResults = record?.labResults ?? []
  const loadError = resource.error
    ? getAnalyticsLoadError(resource.error, locale)
    : resource.data && !resource.data.found
      ? '没有找到这份病历的指标数据。'
      : null
  const analyticsHref = demoRoute ? (publicDemoRoute ? '/demo/analytics' : '/analytics/demo') : `/analytics/${id}`
  const recordHref = demoRoute ? (publicDemoRoute ? '/demo/record' : '/record/demo') : `/record/${id}`

  return (
    <div className={dark ? 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]' : 'ff-light-record-bg min-h-screen text-[var(--ff-text-primary)]'}>
      <ClinicalTopBar theme={theme} title="指标管理" withRail />
      <ArchiveSideNav
        analyticsHref={analyticsHref}
        dark={dark}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        recordHref={recordHref}
        userIsAnonymous={userIsAnonymous}
        userLabel={userLabel ?? (demoRoute ? 'DEMO_MODE' : undefined)}
      />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className={`${shellWideContentClass} t-route-reveal mt-5 md:mt-6`}>
          {demoRoute ? <DemoModeBanner /> : null}
          <LabAnalyticsDashboard
            isDemo={demoRoute}
            isLoading={resource.isLoading}
            labResults={labResults}
            loadError={loadError}
            record={record}
            theme={theme}
          />
        </div>
      </MainShell>
    </div>
  )
}
