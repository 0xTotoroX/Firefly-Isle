/**
 * [INPUT]: 依赖 @/components/app-shell 的 V3 可变侧栏与顶部状态条，依赖 @/components/system/surfaces 的 MainShell 与 DemoModeBanner，依赖全产品 Demo fixture、clinical-analysis、record-sharing、record-editing 字段 patch、patient-record-storage 持久化与 record-edit-queue 串行保存、./demo-mode.logic 的可选公开分享码 Demo 数据源、./record-page.view 的档案/极简表格/Gantt/分享/AI 分析内容组合，点击正式导出时动态加载 @/lib/export-record，依赖 react-router-dom 的 useLocation/useParams 与 transitions-dev.css 的 route/stagger 动效合同。
 * [OUTPUT]: 对外提供 RecordPage 组件，对应公开 /demo/record 与受保护 /record/:id，并挂载详情页主画布入场动效、Demo 模式提醒、可选 Supabase 公开 Demo 读取、Demo AI/分享预览、授权码分享、AI 辅助分析与字段级 Supabase 保存。
 * [POS]: routes 的档案详情 orchestration 层，只负责 Demo/真实路由参数、Demo 数据源加载、加载状态、视图状态、分享状态、AI 分析状态、页面级图表编辑状态、按病历和账号隔离的字段保存状态、导出状态、动效挂载与壳层组合；展示和数据映射下沉到 record-page.view、components/record 与 record-page.logic。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { demoClinicalAnalysisResult, demoLabAnalyticsRecord } from '@/components/analytics/demo-lab-analytics'
import type { RecordSharePanelState } from '@/components/record/RecordSharePanel'
import { labels } from '@/components/record/record-copy'
import type { ExportFormat } from '@/components/record/types'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { MainShell } from '@/components/system/surfaces'
import { analyzePatientRecord, ClinicalAnalysisParseError, type ClinicalAnalysisResult } from '@/lib/clinical-analysis'
import { useLocale } from '@/lib/locale'
import { getOnlineRequiredMessage, isOnlineRequiredError } from '@/lib/network-status'
import { createRecordEditQueue } from '@/lib/record-edit-queue'
import { persistPatientRecord } from '@/lib/patient-record-storage'
import { type PatientRecordEdit } from '@/lib/record-editing'
import { createRecordShare, listRecordShares, revokeRecordShare, type RecordShare } from '@/lib/record-sharing'
import { useTheme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import type { PatientFieldTarget, PatientRangeTarget, PatientRecord } from '@/types/patient'

import { loadDemoPatientRecord } from './demo-mode.logic'
import { getActiveRecordLoadState, loadPatientRecordById, type RecordLoadState } from './record-page.logic'
import { RecordPageContent, type RecordExportState, type RecordSaveState, type RecordViewMode } from './record-page.view'

type RecordPageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userId?: string
  userLabel?: string
}

function isPresentValue(value: string) {
  return /^(今|至今|现在|present|ongoing)$/i.test(value.trim())
}

function getDemoSharePreviewUrl() {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return '/demo/record'
  }

  return `${window.location.origin}/demo/record`
}

function getDemoSharePreviewState(): RecordSharePanelState {
  return {
    createdUrl: getDemoSharePreviewUrl(),
    error: null,
    isCreating: false,
    isLoading: false,
    revokingShareId: null,
    shares: [
      {
        createdAt: '2026-05-13T00:00:00.000Z',
        expiresAt: '2099-12-31T23:59:59.000Z',
        id: 'demo-share-preview',
        patientId: 'demo',
      },
    ],
  }
}

function getInitialClinicalAnalysisState(demoRoute: boolean) {
  return {
    error: null,
    isLoading: false,
    result: demoRoute ? demoClinicalAnalysisResult : null,
  }
}

export function parseRecordRangeEdits(target: PatientRangeTarget, value: string): PatientRecordEdit[] {
  const normalized = value.trim().replace(/\s+/g, '')
  const rangeMatch = normalized.match(/^(.+?)(?:-|–|—|~|至|到)(.+)$/)
  const startValue = (rangeMatch?.[1] ?? normalized).replace(/起$/, '')
  const rawEndValue = rangeMatch?.[2] ?? ''
  const endValue = isPresentValue(rawEndValue) ? '' : rawEndValue.replace(/起$/, '')
  const edits: PatientRecordEdit[] = []

  if (startValue) {
    edits.push({ target: target.start, value: startValue })
  }

  if (target.end) {
    edits.push({ target: target.end, value: endValue })
  }

  return edits
}

export function RecordPage({ isSigningOut, onSignOut, userId, userIsAnonymous, userLabel }: RecordPageProps) {
  const { id = 'demo' } = useParams()
  const location = useLocation()
  const { locale } = useLocale()
  const localeRef = useRef(locale)
  useEffect(() => { localeRef.current = locale }, [locale])
  const { theme } = useTheme()
  const recordRef = useRef<HTMLDivElement>(null)
  const editQueueRef = useRef<ReturnType<typeof createRecordEditQueue> | null>(null)
  const publicDemoRoute = location.pathname.startsWith('/demo')
  const demoRoute = publicDemoRoute || id.trim() === 'demo'
  const [recordLoadState, setRecordLoadState] = useState<RecordLoadState>(() => ({
    error: null,
    isLoading: !demoRoute,
    record: null,
    recordId: demoRoute ? null : id,
  }))
  const [exportState, setExportState] = useState<RecordExportState>({
    error: null,
    format: null,
    isExporting: false,
  })
  const [recordViewMode, setRecordViewMode] = useState<RecordViewMode>('dossier')
  const [isChartEditing, setIsChartEditing] = useState(false)
  const [demoRecord, setDemoRecord] = useState<PatientRecord>(demoLabAnalyticsRecord)
  const [saveState, setSaveState] = useState<RecordSaveState>({ error: null, status: 'idle' })
  const [clinicalAnalysisState, setClinicalAnalysisState] = useState<{
    error: string | null
    isLoading: boolean
    result: ClinicalAnalysisResult | null
  }>(() => getInitialClinicalAnalysisState(demoRoute))
  const [shareState, setShareState] = useState<{
    createdUrl: string | null
    error: string | null
    isCreating: boolean
    isLoading: boolean
    revokingShareId: string | null
    shares: RecordShare[]
  }>({
    createdUrl: null as string | null,
    error: null as string | null,
    isCreating: false,
    isLoading: false,
    revokingShareId: null as string | null,
    shares: [],
  })
  const dark = theme === 'dark'

  useEffect(() => {
    editQueueRef.current = null
    setSaveState({ error: null, status: 'idle' })
    if (demoRoute) {
      let active = true

      void loadDemoPatientRecord().then(({ record }) => {
        if (!active) {
          return
        }

        setDemoRecord(record)
      })

      return () => {
        active = false
        editQueueRef.current = null
      }
    }

    let active = true

    void loadPatientRecordById(id)
      .then((record) => {
        if (!active) {
          return
        }

        setRecordLoadState({
          error: null,
          isLoading: false,
          record,
          recordId: id,
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setRecordLoadState({
          error: isOnlineRequiredError(error) ? getOnlineRequiredMessage(localeRef.current) : labels[localeRef.current].loadRecordError,
          isLoading: false,
          record: null,
          recordId: id,
        })
      })

    return () => {
      active = false
      editQueueRef.current = null
    }
  }, [demoRoute, id, userId])

  const activeRecordLoadState = getActiveRecordLoadState({ demoRoute, id, recordLoadState })
  const shareRecordId = demoRoute ? undefined : activeRecordLoadState.record?.id
  const visibleShareState = demoRoute ? getDemoSharePreviewState() : shareRecordId ? shareState : undefined

  useEffect(() => {
    setClinicalAnalysisState(getInitialClinicalAnalysisState(demoRoute))
  }, [demoRoute, id])

  useEffect(() => {
    if (!shareRecordId) {
      setShareState({
        createdUrl: null,
        error: null,
        isCreating: false,
        isLoading: false,
        revokingShareId: null,
        shares: [],
      })
      return undefined
    }

    let active = true

    setShareState((current) => ({
      ...current,
      error: null,
      isLoading: true,
    }))

    void listRecordShares(shareRecordId)
      .then((shares) => {
        if (!active) {
          return
        }

        setShareState((current) => ({
          ...current,
          error: null,
          isLoading: false,
          shares,
        }))
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setShareState((current) => ({
          ...current,
          error: isOnlineRequiredError(error) ? getOnlineRequiredMessage(locale) : locale === 'zh' ? '读取分享失败，请稍后重试。' : 'Failed to load shares. Please retry.',
          isLoading: false,
        }))
      })

    return () => {
      active = false
    }
  }, [locale, shareRecordId])

  function getEditableRecord() {
    return demoRoute ? demoRecord : activeRecordLoadState.record
  }

  function setEditableRecord(record: PatientRecord) {
    if (demoRoute) {
      setDemoRecord(record)
      return
    }

    setRecordLoadState((current) => ({
      ...current,
      record,
    }))
  }

  async function handleCommitEdits(edits: PatientRecordEdit[]) {
    const record = getEditableRecord()
    if (!record || edits.length === 0) return
    if (!demoRoute && !userId) {
      setSaveState({ error: locale === 'zh' ? '缺少登录用户，无法保存。' : 'Missing signed-in user.', status: 'error' })
      return
    }
    const queue = editQueueRef.current ?? createRecordEditQueue(record, demoRoute ? async (next) => next : (next) => persistPatientRecord(next, userId!))
    editQueueRef.current = queue
    setSaveState({ error: null, status: 'saving' })
    try {
      const persistedRecord = await queue.enqueue(edits)
      if (editQueueRef.current !== queue) return
      setEditableRecord(persistedRecord)
      setSaveState({ error: null, status: queue.pending ? 'saving' : 'saved' })
    } catch (error) {
      if (editQueueRef.current !== queue) return
      setSaveState({
        error: isOnlineRequiredError(error) ? getOnlineRequiredMessage(locale) : locale === 'zh' ? '这次修改未保存，请重试。' : 'This change was not saved. Please retry.',
        status: 'error',
      })
    }
  }

  async function handleCommitField(target: PatientFieldTarget, value: string) {
    await handleCommitEdits([{ target, value }])
  }

  async function handleCommitRange(target: PatientRangeTarget, value: string) {
    await handleCommitEdits(parseRecordRangeEdits(target, value))
  }

  async function handleExport(format: ExportFormat) {
    if (!recordRef.current || !getEditableRecord() || exportState.isExporting) {
      return
    }

    setExportState({
      error: null,
      format,
      isExporting: true,
    })

    try {
      const { exportElementAsPdf, exportElementAsPng } = await import('@/lib/export-record')

      if (format === 'pdf') {
        await exportElementAsPdf(recordRef.current)
      } else {
        await exportElementAsPng(recordRef.current)
      }

      setExportState({
        error: null,
        format: null,
        isExporting: false,
      })
    } catch (error) {
      console.error(error)
      setExportState({
        error: labels[locale].exportError,
        format: null,
        isExporting: false,
      })
    }
  }

  function getClinicalAnalysisError(error: unknown) {
    if (isOnlineRequiredError(error)) {
      return getOnlineRequiredMessage(locale)
    }

    if (error instanceof ClinicalAnalysisParseError) {
      return locale === 'zh' ? 'AI 返回内容无法解析，请稍后重试。' : 'The AI response could not be parsed. Please retry.'
    }

    if (error instanceof Error) {
      return locale === 'zh' ? `AI 分析失败：${error.message}` : `AI analysis failed: ${error.message}`
    }

    return locale === 'zh' ? 'AI 分析失败，请稍后重试。' : 'AI analysis failed. Please retry.'
  }

  async function handleClinicalAnalyze() {
    if (demoRoute || !activeRecordLoadState.record || clinicalAnalysisState.isLoading) {
      return
    }

    setClinicalAnalysisState({ error: null, isLoading: true, result: null })

    try {
      const result = await analyzePatientRecord(activeRecordLoadState.record)
      setClinicalAnalysisState({ error: null, isLoading: false, result })
    } catch (error) {
      setClinicalAnalysisState({ error: getClinicalAnalysisError(error), isLoading: false, result: null })
    }
  }

  function getShareActionError(error: unknown) {
    if (isOnlineRequiredError(error)) {
      return getOnlineRequiredMessage(locale)
    }

    if (error instanceof Error) {
      return locale === 'zh' ? `分享操作失败：${error.message}` : `Share action failed: ${error.message}`
    }

    return locale === 'zh' ? '分享操作失败，请稍后重试。' : 'Share action failed. Please retry.'
  }

  async function handleCreateShare() {
    if (!shareRecordId || shareState.isCreating) {
      return
    }

    setShareState((current) => ({
      ...current,
      error: null,
      isCreating: true,
    }))

    try {
      const created = await createRecordShare(shareRecordId)

      setShareState((current) => ({
        ...current,
        createdUrl: created.url,
        error: null,
        isCreating: false,
        shares: [created.share, ...current.shares.filter((share) => share.id !== created.share.id)],
      }))
    } catch (error) {
      setShareState((current) => ({
        ...current,
        error: getShareActionError(error),
        isCreating: false,
      }))
    }
  }

  function handleCopyShareUrl() {
    const createdUrl = demoRoute ? getDemoSharePreviewUrl() : shareState.createdUrl

    if (!createdUrl) {
      return
    }

    void navigator.clipboard?.writeText(createdUrl)
  }

  async function handleRevokeShare(shareId: string) {
    setShareState((current) => ({
      ...current,
      error: null,
      revokingShareId: shareId,
    }))

    try {
      const revokedShare = await revokeRecordShare(shareId)

      setShareState((current) => ({
        ...current,
        error: null,
        revokingShareId: null,
        shares: current.shares.map((share) => (share.id === revokedShare.id ? revokedShare : share)),
      }))
    } catch (error) {
      setShareState((current) => ({
        ...current,
        error: getShareActionError(error),
        revokingShareId: null,
      }))
    }
  }

  return (
    <div className={dark ? 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]' : 'ff-light-record-bg min-h-screen text-[var(--ff-text-primary)]'}>
      <ClinicalTopBar theme={theme} title={locale === 'zh' ? '病历详情' : 'Record Detail'} withRail />
      <ArchiveSideNav
        analyticsHref={demoRoute ? (publicDemoRoute ? '/demo/analytics' : '/analytics/demo') : `/analytics/${id}`}
        dark={dark}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        recordHref={demoRoute ? (publicDemoRoute ? '/demo/record' : '/record/demo') : `/record/${id}`}
        userIsAnonymous={userIsAnonymous}
        userLabel={userLabel ?? (demoRoute ? 'DEMO_MODE' : id)}
      />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-4 md:px-6 md:pb-6`} theme={theme}>
        <div
          className={`${shellWideContentClass} t-route-reveal mt-5 md:mt-6`}
          data-testid="record-responsive-canvas"
        >
          {demoRoute ? <DemoModeBanner /> : null}
          <RecordPageContent
            activeRecordLoadState={activeRecordLoadState}
            clinicalAnalysisState={clinicalAnalysisState}
            demoRecord={demoRecord}
            demoRoute={demoRoute}
            exportState={exportState}
            isChartEditing={isChartEditing}
            locale={locale}
            onChartEditingChange={setIsChartEditing}
            onClinicalAnalyze={handleClinicalAnalyze}
            onCopyShareUrl={handleCopyShareUrl}
            onCommitField={handleCommitField}
            onCommitRange={handleCommitRange}
            onCreateShare={handleCreateShare}
            onExport={(format) => void handleExport(format)}
            onRevokeShare={(shareId) => void handleRevokeShare(shareId)}
            onViewModeChange={setRecordViewMode}
            recordRef={recordRef}
            saveState={saveState}
            sharePreviewNotice={demoRoute ? (locale === 'zh' ? 'Demo 只展示分享入口形态，不创建真实授权码，也不会写入 record_shares。' : 'Demo previews sharing only. It does not create authorization codes or write record_shares.') : undefined}
            shareState={visibleShareState}
            theme={theme}
            viewMode={recordViewMode}
          />
        </div>
      </MainShell>
    </div>
  )
}
