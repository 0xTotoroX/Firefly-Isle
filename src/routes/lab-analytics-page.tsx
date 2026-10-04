/**
 * [INPUT]: 共享指标统计、患者导航、Demo 内存会话和真实病历读取。
 * [OUTPUT]: LabAnalyticsPage，读取当前患者指标并提供模式内上传入口。
 * [POS]: 指标页路由编排；演示与正式页面使用同一展示组件，文件录入归工作区。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { Link, useLocation, useParams } from 'react-router-dom'
import { useDemoSession, useProductPath } from '@/lib/demo-session'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { demoLabAnalyticsRecord } from '@/components/analytics/demo-lab-analytics'
import { LabAnalyticsDashboard } from '@/components/analytics/lab-analytics-dashboard'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { ClinicalRecordNav } from '@/components/record/clinical-record-nav'
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
  return isOnlineRequiredError(error) ? getOnlineRequiredMessage(locale) : locale === 'zh' ? '无法读取这份病历的指标数据，请稍后重试。' : 'Could not load the lab readings. Please retry.'
}

export function LabAnalyticsPage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: LabAnalyticsPageProps) {
  const { id = 'demo' } = useParams()
  const demoSession = useDemoSession()?.session
  const productPath = useProductPath()
  const location = useLocation()
  const { locale } = useLocale()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const publicDemoRoute = location.pathname.startsWith('/demo')
  const demoRoute = publicDemoRoute || id.trim() === 'demo'
  const initialDemoRecord = demoSession?.getState().records.find((record) => record.id === id) ?? demoLabAnalyticsRecord
  const resource = useAsyncResource<AnalyticsRecordSource>(
    () =>
      demoRoute
        ? (demoSession ? demoSession.loadRecord(id).then((record) => ({ record })) : loadDemoPatientRecord()).then(({ record }) => ({ found: true, record }))
        : loadPatientRecordById(id).then((record) => ({ found: record !== null, record })),
    [demoRoute, id, demoSession],
    demoRoute ? { found: true, record: initialDemoRecord } : null,
  )

  const record = resource.data?.record ?? null
  const labResults = record?.labResults ?? []
  const loadError = resource.error
    ? getAnalyticsLoadError(resource.error, locale)
    : resource.data && !resource.data.found
      ? (locale === 'zh' ? '没有找到这份病历的指标数据。' : 'Patient record not found.')
      : null
  const analyticsHref = productPath(`/analytics/${id}`)
  const recordHref = productPath(`/record/${id}`)

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
          <ClinicalRecordNav active="labs" locale={locale} patientId={id} />
          {record ? <Link className="my-3 inline-flex min-h-[44px] items-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold" to={productPath(`/app?patient=${encodeURIComponent(id)}`)}>{locale === 'zh' ? '为当前患者上传化验报告' : 'Upload this patient’s lab report'}</Link> : null}
          <LabAnalyticsDashboard
            isLoading={resource.isLoading}
            labResults={labResults}
            loadError={loadError}
            onRetry={resource.reload}
            uploadHref={productPath(`/app?patient=${encodeURIComponent(id)}`)}
            theme={theme}
          />
        </div>
      </MainShell>
    </div>
  )
}
