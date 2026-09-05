/**
 * [INPUT]: 依赖 react-router-dom 的 Link/useParams，依赖 app-shell 的 V3 壳层与 surfaces，依赖 patient-record-storage 的病历读取、follow-up-storage 的随访 CRUD 与状态写入、async-resource 加载基元、copy 字典、locale/theme 与 theme tokens。
 * [OUTPUT]: 对外提供 FollowUpPage，对应 /record/:id/follow-up。
 * [POS]: routes 的随访页：显式随访状态（F3）+ 随访就诊记录 CRUD（F2），复查倒计时由 Dashboard 消费（F1）。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { MainShell } from '@/components/system/surfaces'
import { useAsyncResource } from '@/lib/async-resource'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { loadPatientRecordById } from '@/lib/patient-record-storage'
import { type FollowUpVisit, type FollowUpVisitInput, createFollowUpVisit, deleteFollowUpVisit, loadFollowUpVisits, setFollowUpStatus, updateFollowUpVisit } from '@/lib/follow-up-storage'
import { useTheme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import type { FollowUpStatus } from '@/types/patient'

const FIELD_CLASS =
  'w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 py-2 text-sm font-semibold outline-none focus-visible:border-[var(--ff-accent-primary)]'

const STATUS_OPTIONS: FollowUpStatus[] = ['treating', 'paused', 'completed', 'lost']

type FollowUpPageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

function statusCopy(status: FollowUpStatus, locale: 'zh' | 'en') {
  if (status === 'paused') {
    return getCopy(copy.followUp.statusPaused, locale)
  }

  if (status === 'completed') {
    return getCopy(copy.followUp.statusCompleted, locale)
  }

  if (status === 'lost') {
    return getCopy(copy.followUp.statusLost, locale)
  }

  return getCopy(copy.followUp.statusTreating, locale)
}

export function FollowUpPage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: FollowUpPageProps) {
  const { id = '' } = useParams()
  const { locale } = useLocale()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const recordResource = useAsyncResource(() => loadPatientRecordById(id), [id])
  const visitsResource = useAsyncResource(() => loadFollowUpVisits(id), [id])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [visitedOn, setVisitedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [location, setLocation] = useState('')
  const [doctor, setDoctor] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [nextPlan, setNextPlan] = useState('')
  const [nextVisitOn, setNextVisitOn] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const status = recordResource.data?.followUpStatus ?? null

  function resetForm() {
    setEditingId(null)
    setVisitedOn(new Date().toISOString().slice(0, 10))
    setLocation('')
    setDoctor('')
    setConclusion('')
    setNextPlan('')
    setNextVisitOn('')
  }

  function startEdit(visit: FollowUpVisit) {
    setEditingId(visit.id)
    setVisitedOn(visit.visitedOn)
    setLocation(visit.location ?? '')
    setDoctor(visit.doctor ?? '')
    setConclusion(visit.conclusion ?? '')
    setNextPlan(visit.nextPlan ?? '')
    setNextVisitOn(visit.nextVisitOn ?? '')
    setFeedback(null)
    setError(null)
  }

  async function handleSave() {
    if (!visitedOn) {
      setError(getCopy(copy.followUp.saveFailedFeedback, locale))
      return
    }

    setSaving(true)
    setError(null)
    setFeedback(null)

    const input: FollowUpVisitInput = { conclusion, doctor, location, nextPlan, nextVisitOn: nextVisitOn || null, visitedOn }

    try {
      if (editingId) {
        await updateFollowUpVisit(editingId, input)
      } else {
        await createFollowUpVisit(id, input)
      }

      resetForm()
      setFeedback(getCopy(copy.followUp.savedFeedback, locale))
      visitsResource.reload()
    } catch {
      setError(getCopy(copy.followUp.saveFailedFeedback, locale))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(visitId: string) {
    setError(null)

    try {
      await deleteFollowUpVisit(visitId)
      visitsResource.reload()
    } catch {
      setError(getCopy(copy.followUp.deleteFailedFeedback, locale))
    }
  }

  async function handleStatusChange(next: FollowUpStatus | null) {
    setError(null)

    try {
      await setFollowUpStatus(id, next)
      setFeedback(getCopy(copy.followUp.statusSavedFeedback, locale))
      recordResource.reload()
    } catch {
      setError(getCopy(copy.followUp.saveFailedFeedback, locale))
    }
  }

  const visits = visitsResource.data ?? []

  return (
    <div className="min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]">
      <ClinicalTopBar theme={theme} title={getCopy(copy.followUp.title, locale)} withRail />
      <ArchiveSideNav dark={dark} isSigningOut={isSigningOut} onSignOut={onSignOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className={`${shellWideContentClass} t-route-reveal mx-auto mt-5 max-w-3xl md:mt-6`}>
          <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.followUp.eyebrow, locale)}</div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-[var(--ff-font-display)] text-3xl font-black tracking-tight">{getCopy(copy.followUp.title, locale)}</h1>
            <Link
              className="t-control-press inline-flex min-h-[36px] items-center rounded-[12px] border border-[var(--ff-border-default)] px-3 text-sm font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-primary)]"
              to={`/record/${id}`}
            >
              {getCopy(copy.followUp.backToRecord, locale)}
            </Link>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.followUp.description, locale)}</p>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-panel)] p-6">
            <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.followUp.statusLabel, locale)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                aria-pressed={status === null}
                className="t-control-press min-h-[38px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold aria-pressed:border-[var(--ff-accent-primary)] aria-pressed:text-[var(--ff-accent-primary)]"
                data-testid="follow-up-status-auto"
                onClick={() => void handleStatusChange(null)}
                type="button"
              >
                {getCopy(copy.followUp.statusAuto, locale)}
              </button>
              {STATUS_OPTIONS.map((option) => (
                <button
                  aria-pressed={status === option}
                  className="t-control-press min-h-[38px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold aria-pressed:border-[var(--ff-accent-primary)] aria-pressed:text-[var(--ff-accent-primary)]"
                  data-testid={`follow-up-status-${option}`}
                  key={option}
                  onClick={() => void handleStatusChange(option)}
                  type="button"
                >
                  {statusCopy(option, locale)}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-panel)] p-6">
            <h2 className="font-[var(--ff-font-display)] text-lg font-black">{getCopy(copy.followUp.formTitle, locale)}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.followUp.visitedOnLabel, locale)}</div>
                <input className={`${FIELD_CLASS} mt-2`} data-testid="follow-up-date-input" onChange={(event) => setVisitedOn(event.target.value)} type="date" value={visitedOn} />
              </div>
              <div>
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.followUp.nextVisitOnLabel, locale)}</div>
                <input className={`${FIELD_CLASS} mt-2`} data-testid="follow-up-next-date-input" onChange={(event) => setNextVisitOn(event.target.value)} type="date" value={nextVisitOn} />
              </div>
              <div>
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.followUp.locationLabel, locale)}</div>
                <input className={`${FIELD_CLASS} mt-2`} maxLength={120} onChange={(event) => setLocation(event.target.value)} placeholder={getCopy(copy.followUp.locationPlaceholder, locale)} value={location} />
              </div>
              <div>
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.followUp.doctorLabel, locale)}</div>
                <input className={`${FIELD_CLASS} mt-2`} maxLength={120} onChange={(event) => setDoctor(event.target.value)} value={doctor} />
              </div>
              <div className="sm:col-span-2">
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.followUp.conclusionLabel, locale)}</div>
                <textarea className={`${FIELD_CLASS} mt-2 min-h-[72px]`} maxLength={2000} onChange={(event) => setConclusion(event.target.value)} value={conclusion} />
              </div>
              <div className="sm:col-span-2">
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.followUp.nextPlanLabel, locale)}</div>
                <input className={`${FIELD_CLASS} mt-2`} maxLength={2000} onChange={(event) => setNextPlan(event.target.value)} value={nextPlan} />
              </div>
            </div>

            {feedback ? (
              <p className="mt-3 text-sm text-[var(--ff-accent-success)]" role="status">
                {feedback}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-[var(--ff-critical)]" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                className="t-control-press inline-flex min-h-[46px] items-center justify-center rounded-[14px] bg-[var(--ff-accent-primary)] px-6 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="follow-up-save-button"
                disabled={saving}
                onClick={() => void handleSave()}
                type="button"
              >
                {saving ? getCopy(copy.followUp.savingButton, locale) : getCopy(copy.followUp.saveButton, locale)}
              </button>
              {editingId ? (
                <button className="t-control-press inline-flex min-h-[46px] items-center rounded-[14px] border border-[var(--ff-border-default)] px-4 text-sm font-semibold text-[var(--ff-text-secondary)]" onClick={resetForm} type="button">
                  {getCopy(copy.followUp.cancelButton, locale)}
                </button>
              ) : null}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="font-[var(--ff-font-display)] text-lg font-black">{getCopy(copy.followUp.title, locale)}</h2>
            {visitsResource.isLoading ? (
              <div className="mt-3 space-y-2" role="status">
                {[1, 2].map((key) => (
                  <div className="h-16 animate-pulse rounded-[var(--ff-radius-md)] bg-[var(--ff-surface-inset)]" key={key} />
                ))}
              </div>
            ) : visits.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--ff-text-muted)]">{getCopy(copy.followUp.empty, locale)}</p>
            ) : (
              <ul className="mt-3 space-y-2" data-testid="follow-up-list">
                {visits.map((visit) => (
                  <li className="rounded-[var(--ff-radius-md)] bg-[var(--ff-surface-panel)] p-4" key={visit.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-[var(--ff-font-mono)] text-xs text-[var(--ff-text-muted)]">{visit.visitedOn}</span>
                        {visit.location ? <span className="truncate text-sm font-bold">{visit.location}</span> : null}
                        {visit.doctor ? <span className="truncate text-xs text-[var(--ff-text-secondary)]">{visit.doctor}</span> : null}
                        {visit.nextVisitOn ? (
                          <span className="inline-flex items-center rounded-[var(--ff-radius-sm)] border border-[color-mix(in_srgb,var(--ff-low)_46%,transparent)] px-1.5 py-0.5 font-[var(--ff-font-mono)] text-[10px] font-bold text-[var(--ff-low)]">
                            {getCopy(copy.followUp.nextVisitPrefix, locale)} {visit.nextVisitOn}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="t-control-press rounded-[var(--ff-radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-primary)]" data-testid={`follow-up-edit-${visit.id}`} onClick={() => startEdit(visit)} type="button">
                          {getCopy(copy.followUp.editButton, locale)}
                        </button>
                        <button
                          className="t-control-press rounded-[var(--ff-radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--ff-text-secondary)] hover:text-[var(--ff-critical)]"
                          data-testid={`follow-up-delete-${visit.id}`}
                          onClick={() => void handleDelete(visit.id)}
                          type="button"
                        >
                          {getCopy(copy.followUp.deleteButton, locale)}
                        </button>
                      </div>
                    </div>
                    {visit.conclusion || visit.nextPlan ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[var(--ff-text-secondary)]">
                        {visit.conclusion ?? ''}
                        {visit.conclusion && visit.nextPlan ? '\n' : ''}
                        {visit.nextPlan ? `${getCopy(copy.followUp.nextPlanLabel, locale)}：${visit.nextPlan}` : ''}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </MainShell>
    </div>
  )
}
