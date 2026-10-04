/**
 * [INPUT]: 病历/随访存储、日历日期工具、共享病历导航/删除确认、V3 壳层与双语 copy。
 * [OUTPUT]: FollowUpPage，提供患者隔离的随访状态、可恢复表单和就诊记录列表。
 * [POS]: /record/:id/follow-up 的前端编排；读取失败不伪装为空态，保存成功后重新读取。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useDemoSession } from '@/lib/demo-session'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { ClinicalRecordNav } from '@/components/record/clinical-record-nav'
import { DeleteRecordButton } from '@/components/record/delete-record-button'
import { RecordLoadFeedback } from '@/components/record/record-load-feedback'
import { MainShell } from '@/components/system/surfaces'
import { useAsyncResource } from '@/lib/async-resource'
import { isCalendarDate, localCalendarDate } from '@/lib/calendar-date'
import { copy, getCopy } from '@/lib/copy'
import { createFollowUpVisit, deleteFollowUpVisit, loadFollowUpVisits, setFollowUpStatus, updateFollowUpVisit, type FollowUpVisit } from '@/lib/follow-up-storage'
import { useLocale } from '@/lib/locale'
import { loadPatientRecordById } from '@/lib/patient-record-storage'
import { useTheme } from '@/lib/theme'
import { sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import type { FollowUpStatus } from '@/types/patient'

const FIELD_CLASS = 'mt-2 min-h-[44px] w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 py-2 text-base text-[var(--ff-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-accent-text)] sm:text-sm'
const LABEL_CLASS = 'text-sm font-semibold text-[var(--ff-text-secondary)]'
const STATUS_OPTIONS = ['treating', 'paused', 'completed', 'lost'] as const
const STATUS_COPY = { treating: copy.followUp.statusTreating, paused: copy.followUp.statusPaused, completed: copy.followUp.statusCompleted, lost: copy.followUp.statusLost }

function blankVisit() {
  return { visitedOn: localCalendarDate(), nextVisitOn: '', location: '', doctor: '', conclusion: '', nextPlan: '' }
}

const FIELDS = [
  { key: 'visitedOn', label: copy.followUp.visitedOnLabel, type: 'date', testId: 'follow-up-date-input' },
  { key: 'nextVisitOn', label: copy.followUp.nextVisitOnLabel, type: 'date', testId: 'follow-up-next-date-input' },
  { key: 'location', label: copy.followUp.locationLabel, type: 'text', maxLength: 120 },
  { key: 'doctor', label: copy.followUp.doctorLabel, type: 'text', maxLength: 120 },
  { key: 'conclusion', label: copy.followUp.conclusionLabel, type: 'textarea', maxLength: 2000 },
  { key: 'nextPlan', label: copy.followUp.nextPlanLabel, type: 'text', maxLength: 2000 },
] as const

type FollowUpPageProps = { isSigningOut?: boolean; onSignOut?: () => void; userIsAnonymous?: boolean; userLabel?: string }

export function FollowUpPage(props: FollowUpPageProps) {
  const { id = '' } = useParams()
  return <FollowUpPatientPage {...props} key={id} patientId={id} />
}

function FollowUpPatientPage({ patientId, isSigningOut, onSignOut, userIsAnonymous, userLabel }: FollowUpPageProps & { patientId: string }) {
  const { locale } = useLocale()
  const { theme } = useTheme()
  const demo = useDemoSession()
  const recordResource = useAsyncResource(() => (demo ? demo.session.loadRecord : loadPatientRecordById)(patientId), [patientId])
  const visitsResource = useAsyncResource(() => (demo ? demo.session.loadVisits : loadFollowUpVisits)(patientId), [patientId])
  const [form, setForm] = useState(blankVisit)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [operation, setOperation] = useState<'save' | 'status' | 'delete' | null>(null)
  const [dateError, setDateError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const formHeading = useRef<HTMLHeadingElement>(null)
  const loading = recordResource.isLoading || visitsResource.isLoading
  const ready = !loading && !recordResource.error && !visitsResource.error && Boolean(recordResource.data)
  const visits = visitsResource.data ?? []
  const status = recordResource.data?.followUpStatus ?? null

  function resetForm() {
    setEditingId(null)
    setForm(blankVisit())
    setDateError(false)
  }

  function startEdit(visit: FollowUpVisit) {
    setEditingId(visit.id)
    setForm({ visitedOn: visit.visitedOn, nextVisitOn: visit.nextVisitOn ?? '', location: visit.location ?? '', doctor: visit.doctor ?? '', conclusion: visit.conclusion ?? '', nextPlan: visit.nextPlan ?? '' })
    setError(null)
    setFeedback(null)
    setDateError(false)
    formHeading.current?.focus()
  }

  async function handleSave() {
    if (!ready || operation) return
    const invalid = !isCalendarDate(form.visitedOn) || Boolean(form.nextVisitOn && (!isCalendarDate(form.nextVisitOn) || form.nextVisitOn < form.visitedOn))
    setDateError(invalid)
    if (invalid) return
    setOperation('save')
    setError(null)
    setFeedback(null)
    try {
      if (editingId) await (demo ? demo.session.updateVisit : updateFollowUpVisit)(editingId, form)
      else await (demo ? demo.session.createVisit : createFollowUpVisit)(patientId, form)
      resetForm()
      setFeedback(getCopy(copy.followUp.savedFeedback, locale))
      visitsResource.reload()
    } catch {
      setError(getCopy(copy.followUp.saveFailedFeedback, locale))
    } finally {
      setOperation(null)
    }
  }

  async function handleDelete(visitId: string) {
    if (operation) throw new Error('Another operation is pending.')
    setOperation('delete')
    try {
      await (demo ? demo.session.deleteVisit : deleteFollowUpVisit)(visitId)
      if (editingId === visitId) resetForm()
      setFeedback(getCopy(copy.clinicalWorkflow.deleted, locale))
      visitsResource.reload()
    } finally {
      setOperation(null)
    }
  }

  async function handleStatusChange(next: FollowUpStatus | null) {
    if (!ready || operation || next === status) return
    setOperation('status')
    setError(null)
    setFeedback(null)
    try {
      await (demo ? demo.session.setFollowUpStatus : setFollowUpStatus)(patientId, next)
      setFeedback(getCopy(copy.followUp.statusSavedFeedback, locale))
      recordResource.reload()
    } catch {
      setError(getCopy(copy.followUp.saveFailedFeedback, locale))
    } finally {
      setOperation(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]">
      <ClinicalTopBar theme={theme} title={getCopy(copy.followUp.title, locale)} withRail />
      <ArchiveSideNav analyticsHref={`/analytics/${patientId}`} recordHref={`/record/${patientId}`} dark={theme === 'dark'} isSigningOut={isSigningOut} onSignOut={onSignOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className="t-route-reveal mx-auto mt-6 w-full max-w-3xl">
          <p className="text-sm text-[var(--ff-text-muted)]">{recordResource.data?.basicInfo?.name}</p>
          <h1 className="mt-1 font-[var(--ff-font-display)] text-3xl font-bold">{getCopy(copy.followUp.title, locale)}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.followUp.description, locale)}</p>
          {demo ? <DemoModeBanner /> : null}
          <ClinicalRecordNav locale={locale} active="followUp" patientId={patientId} />
          {feedback ? <p className="my-3 text-sm text-[var(--ff-accent-success)]" role="status">{feedback}</p> : null}
          {error ? <p className="my-3 text-sm text-[var(--ff-critical)]" role="alert">{error}</p> : null}
          {!ready ? (
            <RecordLoadFeedback isLoading={loading} message={getCopy(recordResource.error || !recordResource.data ? copy.clinicalWorkflow.recordUnavailable : copy.followUp.loadFailedFeedback, locale)} onRetry={() => { recordResource.reload(); visitsResource.reload() }} />
          ) : (
            <>
              <fieldset className="mb-8" disabled={Boolean(operation)}>
                <legend className={LABEL_CLASS}>{getCopy(copy.followUp.statusLabel, locale)}</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[null, ...STATUS_OPTIONS].map((option) => (
                    <button aria-pressed={status === option} className="t-control-press min-h-[44px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold aria-pressed:border-[var(--ff-accent-text)] aria-pressed:bg-[var(--ff-accent-soft)] aria-pressed:text-[var(--ff-accent-text)] disabled:opacity-60" data-testid={`follow-up-status-${option ?? 'auto'}`} key={option ?? 'auto'} onClick={() => void handleStatusChange(option)} type="button">
                      {getCopy(option ? STATUS_COPY[option] : copy.followUp.statusAuto, locale)}
                    </button>
                  ))}
                </div>
                {operation === 'status' ? <p className="mt-2 text-sm" role="status">{getCopy(copy.clinicalWorkflow.savedStatus, locale)}</p> : null}
              </fieldset>
              <form className="rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-panel)] p-4 sm:p-6" noValidate onSubmit={(event) => { event.preventDefault(); void handleSave() }}>
                <h2 className="text-xl font-bold outline-none" ref={formHeading} tabIndex={-1}>{getCopy(editingId ? copy.clinicalWorkflow.editVisit : copy.followUp.formTitle, locale)}</h2>
                <fieldset className="mt-5 grid gap-5 sm:grid-cols-2" disabled={Boolean(operation)}>
                  {FIELDS.map((field) => (
                    <div className={field.key === 'conclusion' || field.key === 'nextPlan' ? 'sm:col-span-2' : ''} key={field.key}>
                      <label className={LABEL_CLASS} htmlFor={`visit-${field.key}`}>{getCopy(field.label, locale)}</label>
                      {field.type === 'textarea' ? (
                        <textarea className={`${FIELD_CLASS} min-h-[100px] resize-y`} id={`visit-${field.key}`} maxLength={field.maxLength} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} value={form[field.key]} />
                      ) : (
                        <input aria-describedby={dateError && field.type === 'date' ? 'visit-date-error' : undefined} aria-invalid={dateError && field.type === 'date' ? true : undefined} className={FIELD_CLASS} data-testid={'testId' in field ? field.testId : undefined} id={`visit-${field.key}`} maxLength={'maxLength' in field ? field.maxLength : undefined} min={field.key === 'nextVisitOn' ? form.visitedOn : undefined} onChange={(event) => { setForm({ ...form, [field.key]: event.target.value }); setDateError(false) }} required={field.key === 'visitedOn'} type={field.type} value={form[field.key]} />
                      )}
                    </div>
                  ))}
                </fieldset>
                {dateError ? <p className="mt-3 text-sm text-[var(--ff-critical)]" id="visit-date-error" role="alert">{getCopy(copy.clinicalWorkflow.invalidDate, locale)}</p> : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="t-control-press min-h-[46px] rounded-[var(--ff-radius-md)] bg-[var(--ff-accent-primary)] px-6 text-base font-semibold text-[var(--ff-accent-foreground)] hover:bg-[var(--ff-accent-strong)] disabled:opacity-60" data-testid="follow-up-save-button" disabled={Boolean(operation)} type="submit">
                    {getCopy(operation === 'save' ? copy.followUp.savingButton : copy.followUp.saveButton, locale)}
                  </button>
                  {editingId ? <button className="min-h-[46px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold" disabled={Boolean(operation)} onClick={resetForm} type="button">{getCopy(copy.followUp.cancelButton, locale)}</button> : null}
                </div>
              </form>
              <section className="mt-8">
                <h2 className="text-xl font-bold">{getCopy(copy.followUp.title, locale)}</h2>
                {visits.length === 0 ? <p className="mt-3 text-sm leading-6 text-[var(--ff-text-muted)]">{getCopy(copy.followUp.empty, locale)}</p> : (
                  <ul className="mt-3 divide-y divide-[var(--ff-border-default)]" data-testid="follow-up-list">
                    {visits.map((visit) => (
                      <li className="py-5" key={visit.id}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <time className="font-[var(--ff-font-mono)] text-sm font-semibold" dateTime={visit.visitedOn}>{visit.visitedOn}</time>
                            <p className="mt-1 break-words text-sm text-[var(--ff-text-secondary)]">{[visit.location, visit.doctor].filter(Boolean).join(' · ')}</p>
                          </div>
                          <div className="flex gap-1">
                            <button className="min-h-[44px] rounded-[var(--ff-radius-md)] px-3 text-sm font-semibold text-[var(--ff-accent-text)]" data-testid={`follow-up-edit-${visit.id}`} disabled={Boolean(operation)} onClick={() => startEdit(visit)} type="button">{getCopy(copy.followUp.editButton, locale)}</button>
                            <DeleteRecordButton disabled={Boolean(operation)} onDelete={() => handleDelete(visit.id)} testId={`follow-up-delete-${visit.id}`} />
                          </div>
                        </div>
                        {visit.conclusion ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{visit.conclusion}</p> : null}
                        {visit.nextVisitOn || visit.nextPlan ? <div className="mt-3 rounded-[var(--ff-radius-md)] bg-[var(--ff-surface-inset)] px-3 py-2 text-sm leading-6"><span className="font-semibold">{getCopy(copy.followUp.nextVisitPrefix, locale)}{visit.nextVisitOn ? ` · ${visit.nextVisitOn}` : ''}</span>{visit.nextPlan ? <p className="whitespace-pre-wrap break-words text-[var(--ff-text-secondary)]">{visit.nextPlan}</p> : null}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </MainShell>
    </div>
  )
}
