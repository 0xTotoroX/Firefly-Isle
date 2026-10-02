/**
 * [INPUT]: 依赖 react-router-dom 的 Link/useParams，依赖 app-shell 的 V3 壳层与 surfaces，依赖 patient-record-storage 的病历读取（取治疗线）、side-effect-storage 的 CRUD、async-resource 加载基元、copy 字典、locale/theme 与 theme tokens。
 * [OUTPUT]: 对外提供 SideEffectsPage，对应 /record/:id/side-effects。
 * [POS]: 患者隔离的症状日志与复诊摘要；范围按症状持续期相交计算，读取失败可重试、删除需确认。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useDemoSession } from '@/lib/demo-session'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { ClinicalRecordNav } from '@/components/record/clinical-record-nav'
import { DeleteRecordButton } from '@/components/record/delete-record-button'
import { RecordLoadFeedback } from '@/components/record/record-load-feedback'
import { calendarDateOffset, calendarDaysBetween, isCalendarDate, localCalendarDate } from '@/lib/calendar-date'
import { MainShell } from '@/components/system/surfaces'
import { useAsyncResource } from '@/lib/async-resource'
import { writeClipboardText } from '@/lib/clipboard'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { loadFollowUpVisits } from '@/lib/follow-up-storage'
import { loadPatientRecordById } from '@/lib/patient-record-storage'
import { type SideEffectRecord, type SideEffectSeverity, deleteSideEffect, createSideEffect, loadSideEffects, updateSideEffect } from '@/lib/side-effect-storage'
import { useTheme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'

const SEVERITIES: SideEffectSeverity[] = ['mild', 'moderate', 'severe']

const FIELD_CLASS =
  'min-h-[44px] w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-accent-text)] sm:text-sm'

const CUSTOM_SYMPTOMS_KEY = 'firefly-custom-symptoms'
const OVERDUE_DAYS = 7
const MAX_CUSTOM_SYMPTOMS = 12

function readCustomSymptoms() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_SYMPTOMS_KEY) ?? '[]') as unknown

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, MAX_CUSTOM_SYMPTOMS) : []
  } catch {
    return []
  }
}

function rememberCustomSymptom(symptom: string, presetLabels: Set<string>) {
  const trimmed = symptom.trim()

  if (!trimmed || presetLabels.has(trimmed)) {
    return
  }

  const current = readCustomSymptoms()
  const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, MAX_CUSTOM_SYMPTOMS)

  try {
    window.localStorage.setItem(CUSTOM_SYMPTOMS_KEY, JSON.stringify(next))
  } catch {
    // 本地快捷词不可用不应把已经保存的病历报告为失败。
  }
}

function isOverdue(entry: SideEffectRecord, now = new Date()) {
  if (entry.resolvedOn) {
    return false
  }

  return isCalendarDate(entry.occurredOn) && calendarDaysBetween(entry.occurredOn, localCalendarDate(now)) >= OVERDUE_DAYS
}

type SideEffectsPageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

function severityCopy(severity: SideEffectSeverity, locale: 'zh' | 'en') {
  if (severity === 'moderate') {
    return getCopy(copy.sideEffects.severityModerate, locale)
  }

  if (severity === 'severe') {
    return getCopy(copy.sideEffects.severitySevere, locale)
  }

  return getCopy(copy.sideEffects.severityMild, locale)
}

function severityChipClass(severity: SideEffectSeverity) {
  if (severity === 'severe') {
    return 'border-[color-mix(in_srgb,var(--ff-critical)_46%,transparent)] text-[var(--ff-critical)]'
  }

  if (severity === 'moderate') {
    return 'border-[color-mix(in_srgb,var(--ff-accent-warning)_46%,transparent)] text-[var(--ff-accent-warning)]'
  }

  return 'border-[color-mix(in_srgb,var(--ff-low)_46%,transparent)] text-[var(--ff-low)]'
}

export function SideEffectsPage(props: SideEffectsPageProps) {
  const { id = '' } = useParams()
  return <SideEffectsPatientPage {...props} key={id} patientId={id} />
}

function SideEffectsPatientPage({ patientId: id, isSigningOut, onSignOut, userIsAnonymous, userLabel }: SideEffectsPageProps & { patientId: string }) {
  const { locale } = useLocale()
  const { theme } = useTheme()
  const demo = useDemoSession()
  const dark = theme === 'dark'
  const recordResource = useAsyncResource(() => (demo ? demo.session.loadRecord : loadPatientRecordById)(id), [id])
  const effectsResource = useAsyncResource(() => (demo ? demo.session.loadSymptoms : loadSideEffects)(id), [id])
  const visitsResource = useAsyncResource(() => (demo ? demo.session.loadVisits : loadFollowUpVisits)(id), [id])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [symptom, setSymptom] = useState('')
  const [severity, setSeverity] = useState<SideEffectSeverity>('mild')
  const [occurredOn, setOccurredOn] = useState(() => localCalendarDate())
  const [resolvedOn, setResolvedOn] = useState('')
  const [lineId, setLineId] = useState('')
  const [medication, setMedication] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customSymptoms, setCustomSymptoms] = useState<string[]>(() => demo ? demo.state.customSymptoms : readCustomSymptoms())
  const [summaryFrom, setSummaryFrom] = useState(() => calendarDateOffset(-30))
  const [summaryTo, setSummaryTo] = useState(() => localCalendarDate())
  const [summaryText, setSummaryText] = useState('')
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [invalidField, setInvalidField] = useState<'symptom' | 'date' | null>(null)
  const formHeading = useRef<HTMLHeadingElement>(null)
  const loading = recordResource.isLoading || effectsResource.isLoading
  const ready = !loading && !recordResource.error && !effectsResource.error && Boolean(recordResource.data)
  const summaryReady = ready && !visitsResource.isLoading && !visitsResource.error

  useEffect(() => {
    setSummaryText('')
    setSummaryCopied(false)
    setSummaryError(null)
  }, [summaryFrom, summaryTo, effectsResource.data, visitsResource.data, recordResource.data, locale])

  const lines = recordResource.data?.treatmentLines ?? []
  const presetLabels = new Set<string>(
    copy.sideEffects.symptomGroups.flatMap((group) => group.items.map((item) => getCopy(item, locale))),
  )

  function rememberCurrentSymptom() {
    if (demo) {
      if (!presetLabels.has(symptom)) demo.session.rememberSymptom(symptom)
      setCustomSymptoms(demo.session.getState().customSymptoms)
    } else {
      rememberCustomSymptom(symptom, presetLabels)
      setCustomSymptoms(readCustomSymptoms())
    }
  }
  const lineLabel = (targetId: string) => {
    const line = lines.find((entry) => entry.id === targetId)

    return line ? `L${line.lineNumber}${line.regimen ? ` · ${line.regimen}` : ''}` : getCopy(copy.sideEffects.lineNone, locale)
  }

  function resetForm() {
    setEditingId(null)
    setSymptom('')
    setSeverity('mild')
    setOccurredOn(localCalendarDate())
    setResolvedOn('')
    setLineId('')
    setMedication('')
    setNotes('')
    setInvalidField(null)
  }

  function startEdit(entry: SideEffectRecord) {
    setEditingId(entry.id)
    setSymptom(entry.symptom)
    setSeverity(entry.severity)
    setOccurredOn(entry.occurredOn)
    setResolvedOn(entry.resolvedOn ?? '')
    setLineId(entry.lineId ?? '')
    setMedication(entry.medication ?? '')
    setNotes(entry.notes ?? '')
    setFeedback(null)
    setError(null)
    setInvalidField(null)
    formHeading.current?.focus()
  }

  async function handleSave() {
    if (!ready || saving) return
    if (!symptom.trim()) {
      setInvalidField('symptom')
      return
    }
    if (!isCalendarDate(occurredOn) || (resolvedOn && (!isCalendarDate(resolvedOn) || resolvedOn < occurredOn))) {
      setInvalidField('date')
      return
    }
    setInvalidField(null)

    setSaving(true)
    setError(null)
    setFeedback(null)

    const input = {
      lineId: lineId || null,
      medication,
      notes,
      occurredOn,
      resolvedOn: resolvedOn || null,
      severity,
      symptom,
    }

    try {
      if (editingId) {
        await (demo ? demo.session.updateSymptom : updateSideEffect)(editingId, input)
      } else {
        await (demo ? demo.session.createSymptom : createSideEffect)(id, input)
      }

      rememberCurrentSymptom()
      resetForm()
      setFeedback(getCopy(copy.sideEffects.savedFeedback, locale))
      effectsResource.reload()
    } catch {
      setError(getCopy(copy.sideEffects.saveFailedFeedback, locale))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entryId: string) {
    if (saving) throw new Error('Another operation is pending.')
    setSaving(true)
    try {
      await (demo ? demo.session.deleteSymptom : deleteSideEffect)(entryId)
      if (editingId === entryId) resetForm()
      setFeedback(getCopy(copy.clinicalWorkflow.deleted, locale))
      effectsResource.reload()
    } finally {
      setSaving(false)
    }
  }

  const entries = effectsResource.data ?? []

  function generateSummary() {
    if (!summaryReady) return
    if (!isCalendarDate(summaryFrom) || !isCalendarDate(summaryTo) || summaryFrom > summaryTo) {
      setSummaryText('')
      setSummaryError(getCopy(copy.clinicalWorkflow.invalidDate, locale))
      return
    }
    setSummaryError(null)
    const inRange = entries.filter((entry) => entry.occurredOn <= summaryTo && (!entry.resolvedOn || entry.resolvedOn >= summaryFrom))

    const lastVisit = visitsResource.data?.find((visit) => visit.visitedOn <= summaryTo)
    const header =
      locale === 'zh'
        ? `复诊摘要（${summaryFrom} ~ ${summaryTo}，共 ${inRange.length} 条）`
        : `Visit summary (${summaryFrom} ~ ${summaryTo}, ${inRange.length} entries)`
    const lines = inRange.map((entry) => {
      const parts = [
        entry.occurredOn,
        `${entry.symptom}（${severityCopy(entry.severity, locale)}）`,
        entry.lineId ? lineLabel(entry.lineId) : '',
        entry.resolvedOn || getCopy(copy.sideEffects.ongoing, locale),
        entry.medication ? `${locale === 'zh' ? '处理' : 'Action'}：${entry.medication}` : '',
        entry.notes ?? '',
      ]

      return `- ${parts.filter(Boolean).join(' · ')}`
    })

    if (inRange.length === 0) lines.push(getCopy(copy.sideEffects.summaryEmpty, locale))

    const visitLines: string[] = []

    if (lastVisit) {
      const visitParts = [lastVisit.location, lastVisit.doctor, lastVisit.conclusion].filter(Boolean)

      visitLines.push(`- ${locale === 'zh' ? '上次随访' : 'Last visit'}（${lastVisit.visitedOn}）：${visitParts.join(' · ') || '—'}`)

      if (lastVisit.nextVisitOn || lastVisit.nextPlan) {
        visitLines.push(`- ${locale === 'zh' ? '下次安排' : 'Next steps'}：${lastVisit.nextVisitOn ?? '—'}${lastVisit.nextPlan ? ` · ${lastVisit.nextPlan}` : ''}`)
      }
    }

    setSummaryText([[header, ...lines].join('\n'), ...visitLines].join('\n'))
    setSummaryCopied(false)
  }

  async function handleCopySummary() {
    const copied = await writeClipboardText(summaryText)

    setSummaryCopied(copied)
    setSummaryError(copied ? null : getCopy(copy.clinicalWorkflow.copyFailed, locale))
  }

  return (
    <div className={dark ? 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]' : 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]'}>
      <ClinicalTopBar theme={theme} title={getCopy(copy.sideEffects.title, locale)} withRail />
      <ArchiveSideNav analyticsHref={`/analytics/${id}`} recordHref={`/record/${id}`} dark={dark} isSigningOut={isSigningOut} onSignOut={onSignOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className={`${shellWideContentClass} t-route-reveal mx-auto mt-5 max-w-3xl md:mt-6`}>
          <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.eyebrow, locale)}</div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="w-full text-sm text-[var(--ff-text-muted)]">{recordResource.data?.basicInfo?.name}</p>
            <h1 className="font-[var(--ff-font-display)] text-3xl font-black tracking-tight">{getCopy(copy.sideEffects.title, locale)}</h1>

          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.sideEffects.description, locale)}</p>

          {demo ? <DemoModeBanner /> : null}
          <ClinicalRecordNav locale={locale} active="symptoms" patientId={id} />
          {!ready ? <RecordLoadFeedback isLoading={loading} message={getCopy(recordResource.error || !recordResource.data ? copy.clinicalWorkflow.recordUnavailable : copy.sideEffects.loadFailedFeedback, locale)} onRetry={() => { recordResource.reload(); effectsResource.reload() }} /> : <>
          <form className="mt-6 rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-panel)] p-4 sm:p-6" noValidate onSubmit={(event) => { event.preventDefault(); void handleSave() }}>
            <h2 className="font-[var(--ff-font-display)] text-lg font-black outline-none" ref={formHeading} tabIndex={-1}>{getCopy(editingId ? copy.clinicalWorkflow.editSymptom : copy.sideEffects.formTitle, locale)}</h2>
            <fieldset className="mt-4 grid gap-4 sm:grid-cols-2" disabled={saving}>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-[var(--ff-text-secondary)]" htmlFor="symptom-symptom">{getCopy(copy.sideEffects.symptomLabel, locale)}</label>
                <input
                  className={`${FIELD_CLASS} mt-2`}
                  aria-describedby={invalidField === 'symptom' ? 'symptom-validation' : undefined}
                  aria-invalid={invalidField === 'symptom' || undefined}
                  data-testid="side-effect-symptom-input"
                  id="symptom-symptom"
                  required
                  maxLength={120}
                  onChange={(event) => setSymptom(event.target.value)}
                  placeholder={getCopy(copy.sideEffects.symptomPlaceholder, locale)}
                  value={symptom}
                />
                <details className="mt-2">
                  <summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold text-[var(--ff-accent-text)]">{getCopy(copy.clinicalWorkflow.symptomPresets, locale)}</summary>
                  <div className="space-y-2 pb-2">
                  {customSymptoms.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-[var(--ff-font-mono)] text-[9px] uppercase tracking-[0.2em] text-[var(--ff-accent-text)]">
                        {getCopy(copy.sideEffects.customGroup, locale)}
                      </span>
                      {customSymptoms.map((item) => (
                        <button className="t-control-press min-h-[32px] rounded-[var(--ff-radius-full)] border border-[var(--ff-accent-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--ff-accent-text)]" key={item} onClick={() => setSymptom(item)} type="button">
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {copy.sideEffects.symptomGroups.map((group) => (
                    <div className="flex flex-wrap items-center gap-1.5" key={group.label.zh}>
                      <span className="mr-1 font-[var(--ff-font-mono)] text-[9px] uppercase tracking-[0.2em] text-[var(--ff-text-muted)]">
                        {getCopy(group.label, locale)}
                      </span>
                      {group.items.map((item) => {
                        const label = getCopy(item, locale)

                        return (
                          <button
                            className="t-control-press rounded-[var(--ff-radius-full)] border border-[var(--ff-border-default)] px-2.5 py-1 text-xs font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)]"
                            key={label}
                            onClick={() => setSymptom(label)}
                            type="button"
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                  </div>
                </details>
              </div>

              <div>
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.severityLabel, locale)}</div>
                <div aria-label={getCopy(copy.sideEffects.severityLabel, locale)} className="mt-2 flex gap-2" role="group">
                  {SEVERITIES.map((value) => (
                    <button
                      aria-pressed={severity === value}
                      className="t-control-press min-h-[44px] flex-1 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold aria-pressed:border-[var(--ff-accent-primary)] aria-pressed:text-[var(--ff-accent-text)]"
                      data-testid={`side-effect-severity-${value}`}
                      key={value}
                      onClick={() => setSeverity(value)}
                      type="button"
                    >
                      {severityCopy(value, locale)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[var(--ff-text-secondary)]" htmlFor="symptom-occurredOn">{getCopy(copy.sideEffects.dateLabel, locale)}</label>
                <input className={`${FIELD_CLASS} mt-2`} aria-describedby={invalidField === 'date' ? 'symptom-validation' : undefined} aria-invalid={invalidField === 'date' || undefined} data-testid="side-effect-date-input" id="symptom-occurredOn" required onChange={(event) => setOccurredOn(event.target.value)} type="date" value={occurredOn} />
              </div>

              <div>
                <label className="text-sm font-semibold text-[var(--ff-text-secondary)]" htmlFor="symptom-resolvedOn">{getCopy(copy.sideEffects.resolvedLabel, locale)}</label>
                <input className={`${FIELD_CLASS} mt-2`} aria-describedby={invalidField === 'date' ? 'symptom-validation' : undefined} aria-invalid={invalidField === 'date' || undefined} id="symptom-resolvedOn" min={occurredOn} onChange={(event) => setResolvedOn(event.target.value)} type="date" value={resolvedOn} />
              </div>

              <div>
                <label className="text-sm font-semibold text-[var(--ff-text-secondary)]" htmlFor="symptom-line">{getCopy(copy.sideEffects.lineLabel, locale)}</label>
                <select className={`${FIELD_CLASS} mt-2`} id="symptom-line" onChange={(event) => setLineId(event.target.value)} value={lineId}>
                  <option value="">{getCopy(copy.sideEffects.lineNone, locale)}</option>
                  {lines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {`L${line.lineNumber}${line.regimen ? ` · ${line.regimen}` : ''}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-[var(--ff-text-secondary)]" htmlFor="symptom-medication">{getCopy(copy.sideEffects.medicationLabel, locale)}</label>
                <input
                  className={`${FIELD_CLASS} mt-2`}
                  maxLength={120}
                  onChange={(event) => setMedication(event.target.value)}
                  id="symptom-medication"
                  placeholder={getCopy(copy.sideEffects.medicationPlaceholder, locale)}
                  value={medication}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-[var(--ff-text-secondary)]" htmlFor="symptom-notes">{getCopy(copy.sideEffects.notesLabel, locale)}</label>
                <textarea className={`${FIELD_CLASS} mt-2 min-h-[72px]`} id="symptom-notes" maxLength={2000} onChange={(event) => setNotes(event.target.value)} value={notes} />
              </div>
            </fieldset>

            {invalidField ? <p className="mt-3 text-sm text-[var(--ff-critical)]" id="symptom-validation" role="alert">{getCopy(invalidField === 'symptom' ? copy.clinicalWorkflow.symptomRequired : copy.clinicalWorkflow.invalidDate, locale)}</p> : null}
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
                className="t-control-press inline-flex min-h-[46px] items-center justify-center rounded-[14px] bg-[var(--ff-accent-primary)] px-6 text-base font-bold text-[var(--ff-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="side-effect-save-button"
                disabled={saving}
                type="submit"
              >
                {saving ? getCopy(copy.sideEffects.savingButton, locale) : getCopy(copy.sideEffects.saveButton, locale)}
              </button>
              {editingId ? (
                <button className="t-control-press inline-flex min-h-[46px] items-center rounded-[14px] border border-[var(--ff-border-default)] px-4 text-sm font-semibold text-[var(--ff-text-secondary)]" data-testid="side-effect-cancel-button" disabled={saving} onClick={resetForm} type="button">
                  {getCopy(copy.sideEffects.cancelButton, locale)}
                </button>
              ) : null}
            </div>
          </form>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-panel)] p-6" data-testid="side-effect-summary-card">
            <h2 className="font-[var(--ff-font-display)] text-lg font-black">{getCopy(copy.sideEffects.summaryTitle, locale)}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.sideEffects.summaryDescription, locale)}</p>
            {!summaryReady ? <RecordLoadFeedback isLoading={visitsResource.isLoading} message={getCopy(copy.clinicalWorkflow.summaryUnavailable, locale)} onRetry={visitsResource.reload} /> : null}
            {summaryError ? <p className="mt-3 text-sm text-[var(--ff-critical)]" role="alert">{summaryError}</p> : null}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-[var(--ff-text-secondary)]">
                {getCopy(copy.sideEffects.summaryFrom, locale)}
                <input className={`${FIELD_CLASS} mt-1 block`} data-testid="side-effect-summary-from" onChange={(event) => setSummaryFrom(event.target.value)} type="date" value={summaryFrom} />
              </label>
              <label className="text-xs font-semibold text-[var(--ff-text-secondary)]">
                {getCopy(copy.sideEffects.summaryTo, locale)}
                <input className={`${FIELD_CLASS} mt-1 block`} data-testid="side-effect-summary-to" min={summaryFrom} onChange={(event) => setSummaryTo(event.target.value)} type="date" value={summaryTo} />
              </label>
              <button
                className="t-control-press inline-flex min-h-[44px] items-center rounded-[12px] border border-[var(--ff-border-default)] px-4 text-sm font-semibold text-[var(--ff-text-primary)] transition-colors hover:border-[var(--ff-accent-primary)]"
                data-testid="side-effect-summary-generate"
                disabled={!summaryReady || saving}
                onClick={generateSummary}
                type="button"
              >
                {getCopy(copy.sideEffects.summaryGenerate, locale)}
              </button>
            </div>
            {summaryReady && summaryText ? (
              <div className="mt-4">
                <textarea className={`${FIELD_CLASS} min-h-[120px] font-[var(--ff-font-mono)] text-xs leading-5`} aria-label={getCopy(copy.sideEffects.summaryTitle, locale)} data-testid="side-effect-summary-output" readOnly value={summaryText} />
                <button
                  className="t-control-press mt-2 inline-flex min-h-[44px] items-center rounded-[12px] border border-[var(--ff-border-default)] px-4 text-sm font-semibold text-[var(--ff-text-primary)] transition-colors hover:border-[var(--ff-accent-primary)]"
                  data-testid="side-effect-summary-copy"
                  onClick={() => void handleCopySummary()}
                  type="button"
                >
                  {summaryCopied ? getCopy(copy.sideEffects.summaryCopied, locale) : getCopy(copy.sideEffects.summaryCopy, locale)}
                </button>
              </div>
            ) : null}
          </section>

          <section className="mt-6">
            <h2 className="font-[var(--ff-font-display)] text-lg font-black">{getCopy(copy.sideEffects.title, locale)}</h2>
            {effectsResource.isLoading ? (
              <div className="mt-3 space-y-2" role="status">
                {[1, 2].map((key) => (
                  <div className="h-16 animate-pulse rounded-[var(--ff-radius-md)] bg-[var(--ff-surface-inset)]" key={key} />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.empty, locale)}</p>
            ) : (
              <ul className="mt-3 space-y-2" data-testid="side-effect-list">
                {entries.map((entry) => (
                  <li className="rounded-[var(--ff-radius-md)] bg-[var(--ff-surface-panel)] p-4" key={entry.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-[var(--ff-radius-sm)] border px-1.5 py-0.5 font-[var(--ff-font-mono)] text-[10px] font-bold ${severityChipClass(entry.severity)}`}>
                          {severityCopy(entry.severity, locale)}
                        </span>
                        <span className="truncate text-sm font-bold">{entry.symptom}</span>
                        <span className="font-[var(--ff-font-mono)] text-xs text-[var(--ff-text-muted)]">{entry.occurredOn}</span>
                        {entry.lineId ? <span className="font-[var(--ff-font-mono)] text-xs text-[var(--ff-text-muted)]">{lineLabel(entry.lineId)}</span> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="t-control-press rounded-[var(--ff-radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]" data-testid={`side-effect-edit-${entry.id}`} disabled={saving} onClick={() => startEdit(entry)} type="button">
                          {getCopy(copy.sideEffects.editButton, locale)}
                        </button>
                        <DeleteRecordButton disabled={saving} onDelete={() => handleDelete(entry.id)} testId={`side-effect-delete-${entry.id}`} />
                      </div>
                    </div>
                    {entry.medication || entry.notes || !entry.resolvedOn ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--ff-text-secondary)]">
                        {entry.resolvedOn ? '' : `${getCopy(copy.sideEffects.ongoing, locale)} · `}
                        {isOverdue(entry) ? `${getCopy(copy.sideEffects.overdueBadge, locale)} · ` : ''}
                        {entry.medication ? `${entry.medication}` : ''}
                        {entry.medication && entry.notes ? ' · ' : ''}
                        {entry.notes ?? ''}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          </>}
        </div>
      </MainShell>
    </div>
  )
}
