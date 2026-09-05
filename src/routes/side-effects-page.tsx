/**
 * [INPUT]: 依赖 react-router-dom 的 Link/useParams，依赖 app-shell 的 V3 壳层与 surfaces，依赖 patient-record-storage 的病历读取（取治疗线）、side-effect-storage 的 CRUD、async-resource 加载基元、copy 字典、locale/theme 与 theme tokens。
 * [OUTPUT]: 对外提供 SideEffectsPage，对应 /record/:id/side-effects。
 * [POS]: routes 的患者副作用日志页，作为病历的辅助记录：结构化新增/编辑/删除症状条目并关联治疗线；非诊断工具，页面明确急症就医边界。
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
import { type SideEffectRecord, type SideEffectSeverity, deleteSideEffect, createSideEffect, loadSideEffects, updateSideEffect } from '@/lib/side-effect-storage'
import { useTheme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'

const SEVERITIES: SideEffectSeverity[] = ['mild', 'moderate', 'severe']

const FIELD_CLASS =
  'w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 py-2 text-sm font-semibold outline-none focus-visible:border-[var(--ff-accent-primary)]'

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

export function SideEffectsPage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: SideEffectsPageProps) {
  const { id = '' } = useParams()
  const { locale } = useLocale()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const recordResource = useAsyncResource(() => loadPatientRecordById(id), [id])
  const effectsResource = useAsyncResource(() => loadSideEffects(id), [id])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [symptom, setSymptom] = useState('')
  const [severity, setSeverity] = useState<SideEffectSeverity>('mild')
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [resolvedOn, setResolvedOn] = useState('')
  const [lineId, setLineId] = useState('')
  const [medication, setMedication] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lines = recordResource.data?.treatmentLines ?? []
  const lineLabel = (targetId: string) => {
    const line = lines.find((entry) => entry.id === targetId)

    return line ? `L${line.lineNumber}${line.regimen ? ` · ${line.regimen}` : ''}` : getCopy(copy.sideEffects.lineNone, locale)
  }

  function resetForm() {
    setEditingId(null)
    setSymptom('')
    setSeverity('mild')
    setOccurredOn(new Date().toISOString().slice(0, 10))
    setResolvedOn('')
    setLineId('')
    setMedication('')
    setNotes('')
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
  }

  async function handleSave() {
    if (!symptom.trim() || !occurredOn) {
      setError(getCopy(copy.sideEffects.saveFailedFeedback, locale))
      return
    }

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
        await updateSideEffect(editingId, input)
      } else {
        await createSideEffect(id, input)
      }

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
    setError(null)

    try {
      await deleteSideEffect(entryId)
      effectsResource.reload()
    } catch {
      setError(getCopy(copy.sideEffects.deleteFailedFeedback, locale))
    }
  }

  const entries = effectsResource.data ?? []

  return (
    <div className={dark ? 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]' : 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]'}>
      <ClinicalTopBar theme={theme} title={getCopy(copy.sideEffects.title, locale)} withRail />
      <ArchiveSideNav dark={dark} isSigningOut={isSigningOut} onSignOut={onSignOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className={`${shellWideContentClass} t-route-reveal mx-auto mt-5 max-w-3xl md:mt-6`}>
          <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.eyebrow, locale)}</div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-[var(--ff-font-display)] text-3xl font-black tracking-tight">{getCopy(copy.sideEffects.title, locale)}</h1>
            <Link
              className="t-control-press inline-flex min-h-[36px] items-center rounded-[12px] border border-[var(--ff-border-default)] px-3 text-sm font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-primary)]"
              to={`/record/${id}`}
            >
              {getCopy(copy.sideEffects.backToRecord, locale)}
            </Link>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.sideEffects.description, locale)}</p>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-panel)] p-6">
            <h2 className="font-[var(--ff-font-display)] text-lg font-black">{editingId ? getCopy(copy.sideEffects.formTitle, locale) : getCopy(copy.sideEffects.formTitle, locale)}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.symptomLabel, locale)}</div>
                <input
                  className={`${FIELD_CLASS} mt-2`}
                  data-testid="side-effect-symptom-input"
                  maxLength={120}
                  onChange={(event) => setSymptom(event.target.value)}
                  placeholder={getCopy(copy.sideEffects.symptomPlaceholder, locale)}
                  value={symptom}
                />
                <div className="mt-2 space-y-2">
                  {copy.sideEffects.symptomGroups.map((group) => (
                    <div className="flex flex-wrap items-center gap-1.5" key={group.label.zh}>
                      <span className="mr-1 font-[var(--ff-font-mono)] text-[9px] uppercase tracking-[0.2em] text-[var(--ff-text-muted)]">
                        {getCopy(group.label, locale)}
                      </span>
                      {group.items.map((item) => {
                        const label = getCopy(item, locale)

                        return (
                          <button
                            className="t-control-press rounded-[var(--ff-radius-full)] border border-[var(--ff-border-default)] px-2.5 py-1 text-xs font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-primary)]"
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
              </div>

              <div>
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.severityLabel, locale)}</div>
                <div className="mt-2 flex gap-2">
                  {SEVERITIES.map((value) => (
                    <button
                      aria-pressed={severity === value}
                      className="t-control-press min-h-[38px] flex-1 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold aria-pressed:border-[var(--ff-accent-primary)] aria-pressed:text-[var(--ff-accent-primary)]"
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
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.dateLabel, locale)}</div>
                <input className={`${FIELD_CLASS} mt-2`} data-testid="side-effect-date-input" onChange={(event) => setOccurredOn(event.target.value)} type="date" value={occurredOn} />
              </div>

              <div>
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.resolvedLabel, locale)}</div>
                <input className={`${FIELD_CLASS} mt-2`} onChange={(event) => setResolvedOn(event.target.value)} type="date" value={resolvedOn} />
              </div>

              <div>
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.lineLabel, locale)}</div>
                <select className={`${FIELD_CLASS} mt-2`} onChange={(event) => setLineId(event.target.value)} value={lineId}>
                  <option value="">{getCopy(copy.sideEffects.lineNone, locale)}</option>
                  {lines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {`L${line.lineNumber}${line.regimen ? ` · ${line.regimen}` : ''}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.medicationLabel, locale)}</div>
                <input
                  className={`${FIELD_CLASS} mt-2`}
                  maxLength={120}
                  onChange={(event) => setMedication(event.target.value)}
                  placeholder={getCopy(copy.sideEffects.medicationPlaceholder, locale)}
                  value={medication}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.sideEffects.notesLabel, locale)}</div>
                <textarea className={`${FIELD_CLASS} mt-2 min-h-[72px]`} maxLength={2000} onChange={(event) => setNotes(event.target.value)} value={notes} />
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
                data-testid="side-effect-save-button"
                disabled={saving}
                onClick={() => void handleSave()}
                type="button"
              >
                {saving ? getCopy(copy.sideEffects.savingButton, locale) : getCopy(copy.sideEffects.saveButton, locale)}
              </button>
              {editingId ? (
                <button className="t-control-press inline-flex min-h-[46px] items-center rounded-[14px] border border-[var(--ff-border-default)] px-4 text-sm font-semibold text-[var(--ff-text-secondary)]" data-testid="side-effect-cancel-button" onClick={resetForm} type="button">
                  {getCopy(copy.sideEffects.cancelButton, locale)}
                </button>
              ) : null}
            </div>
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
                        <button className="t-control-press rounded-[var(--ff-radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-primary)]" data-testid={`side-effect-edit-${entry.id}`} onClick={() => startEdit(entry)} type="button">
                          {getCopy(copy.sideEffects.editButton, locale)}
                        </button>
                        <button
                          className="t-control-press rounded-[var(--ff-radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--ff-text-secondary)] hover:text-[var(--ff-critical)]"
                          data-testid={`side-effect-delete-${entry.id}`}
                          onClick={() => void handleDelete(entry.id)}
                          type="button"
                        >
                          {getCopy(copy.sideEffects.deleteButton, locale)}
                        </button>
                      </div>
                    </div>
                    {entry.medication || entry.notes || !entry.resolvedOn ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--ff-text-secondary)]">
                        {entry.resolvedOn ? '' : `${getCopy(copy.sideEffects.ongoing, locale)} · `}
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
        </div>
      </MainShell>
    </div>
  )
}
