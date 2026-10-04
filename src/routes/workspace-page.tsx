/**
 * [INPUT]: 系统壳、工作台展示组件、路由患者参数及 useWorkspaceController。
 * [OUTPUT]: WorkspacePage，组合病史输入、OCR 确认、追问、化验导入与可编辑预览。
 * [POS]: /app 的页面组合层；提取、保存和账号隔离归 src/lib/workspace，正式导出归病历页。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部，并同步本目录 AGENTS.md。
 */
import type { CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { MainShell, SectionSurface } from '@/components/system/surfaces'
import { ExtractionComposer } from '@/components/workspace/extraction-composer'
import { FollowUpPanel } from '@/components/workspace/follow-up-panel'
import { LabReportImport } from '@/components/workspace/lab-report-import'
import { ReportPreviewFrame } from '@/components/workspace/report-preview-frame'
import { DEMO_INTAKE_TEXT } from '@/lib/demo-fixtures'
import { useDemoSession, useProductPath } from '@/lib/demo-session'
import { MAX_FOLLOW_UP_ROUNDS } from '@/lib/extraction'
import { useLocale } from '@/lib/locale'
import { useTheme } from '@/lib/theme'
import { shellContentWidthClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import { getWorkspaceComposerMode } from '@/lib/workspace/state'
import { useWorkspaceController } from '@/lib/workspace/use-workspace-controller'
import type { PatientRecord } from '@/types/patient'

type WorkspacePageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

const EMPTY_RECORD: PatientRecord = {
  treatmentLines: [],
}

export function WorkspacePage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: WorkspacePageProps) {
  const [searchParams] = useSearchParams()
  const demo = useDemoSession()
  const productPath = useProductPath()
  const patientId = searchParams.get('patient')
  const { locale } = useLocale()
  const { theme } = useTheme()
  const {
    currentQuestion,
    editFeedback,
    error,
    extractionInput,
    confirmOcrText,
    discardOcrText,
    followUpAnswers,
    handleFieldCommit,
    importMedicalDocument,
    isExtracting,
    isSaving,
    ocr,
    record,
    remainingMissing,
    retryLastAction,
    retryMode,
    runFollowUpExtraction,
    runInitialExtraction,
    submitComposerInput,
    setExtractionInput,
    labImportActive,
    onLabActiveChange,
    reloadAfterLabSave,
    userId,
  } = useWorkspaceController(patientId)
  const displayRecord = record ?? EMPTY_RECORD

  return (
    <div className={`${theme === 'light' ? 'ff-light-workspace-bg' : 'bg-[var(--ff-surface-base)] font-[var(--ff-font-ui)]'} min-h-screen text-[var(--ff-text-primary)]`}>
      <ClinicalTopBar theme={theme} title={locale === 'zh' ? '病程整理台' : 'Clinical Course Organizer'} withRail />
      <ArchiveSideNav
        analyticsHref={record?.id ? `/analytics/${record.id}` : null}
        dark={theme === 'dark'}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        recordHref={record?.id ? `/record/${record.id}` : null}
        userIsAnonymous={userIsAnonymous}
        userLabel={userLabel}
      />

      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen`} theme={theme}>
        <SectionSurface className="border-0 px-4 pb-2 pt-4 md:px-8 md:pb-3 md:pt-4" theme={theme} tone="base">
          <div className={`${shellContentWidthClass} t-route-reveal space-y-6`}>
            {demo ? (
              <>
                <DemoModeBanner />
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <button
                    className="min-h-[44px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 font-semibold"
                    onClick={() => setExtractionInput(DEMO_INTAKE_TEXT)}
                    type="button"
                  >
                    {locale === 'zh' ? '填入虚构示例' : 'Use fictional example'}
                  </button>
                  <span>
                    {locale === 'zh'
                      ? '提取、追问与口述修改均返回固定示例，可直接编辑字段。'
                      : 'Extraction and conversational edits return fixed examples. Fields remain editable.'}
                  </span>
                </div>
              </>
            ) : null}
            <ExtractionComposer
              composerMode={getWorkspaceComposerMode(record)}
              error={error}
              feedback={editFeedback}
              extractionInput={extractionInput}
              isExtracting={isExtracting}
              isSaving={isSaving}
              isLocked={labImportActive}
              ocrState={ocr}
              onConfirmOcrText={() => void confirmOcrText()}
              onDiscardOcrText={discardOcrText}
              onExtract={() => void submitComposerInput()}
              onExtractAsNew={record ? () => void runInitialExtraction() : undefined}
              onImportFile={(file) => void importMedicalDocument(file)}
              onInputChange={setExtractionInput}
              onRetry={() => void retryLastAction()}
              remainingMissingCount={remainingMissing.length}
              retryMode={retryMode}
              theme={theme}
            />

            {currentQuestion ? (
              <FollowUpPanel
                busy={isExtracting || isSaving || ocr.isProcessing || labImportActive}
                currentQuestion={currentQuestion}
                onSubmit={(value) => void runFollowUpExtraction(value)}
                theme={theme}
              />
            ) : null}
            <LabReportImport
              disabled={isExtracting || isSaving || ocr.isProcessing || Boolean(ocr.text) || retryMode === 'save'}
              key={`${userId}:${patientId}:${record?.id}`}
              onActiveChange={onLabActiveChange}
              onSaved={reloadAfterLabSave}
              record={record}
              theme={theme}
            />
          </div>
        </SectionSurface>

        <SectionSurface className="border-0 px-4 pb-8 pt-2 md:px-8 md:pb-8 md:pt-3" theme={theme} tone="base">
          <div className={`${shellContentWidthClass} t-stagger`} style={{ '--t-order': 1 } as CSSProperties}>
            <ReportPreviewFrame
              followUpCount={Math.min(MAX_FOLLOW_UP_ROUNDS, followUpAnswers.length)}
              isExtracting={isExtracting}
              isSaving={isSaving}
              isLocked={labImportActive || ocr.isProcessing || retryMode === 'save'}
              onCommitField={handleFieldCommit}
              record={displayRecord}
              recordDetailsHref={record?.id ? productPath(`/record/${record.id}`) : undefined}
              remainingMissing={remainingMissing}
              setReportRef={() => undefined}
              theme={theme}
            />
          </div>
        </SectionSurface>
      </MainShell>
    </div>
  )
}
