/**
 * [INPUT]: 现有化验识别、审核和批次保存边界，以及 Demo 固定示例和内存会话。
 * [OUTPUT]: LabReportImport，多文件队列逐份核对、保存、重试和重复批次确认。
 * [POS]: 工作区化验录入；真实文件走服务，演示只加载固定文本并保存到内存。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useDemoSession, useProductPath } from '@/lib/demo-session'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionSurface } from '@/components/system/surfaces'
import { getLabIndicatorsByCategory } from '@/lib/lab-dictionary'
import { extractLabReportReviewRows, getLabReviewIssues, hasBlockingReviewRows, toConfirmedLabReadings, type LabReviewIssue, type LabReviewRow } from '@/lib/lab-report-ingestion'
import { saveLabReportBatch } from '@/lib/lab-report-storage'
import { classifyLabReading } from '@/lib/lab-results'
import { useLocale } from '@/lib/locale'
import { getMedicalDocumentOcrMessage, recognizeMedicalDocument } from '@/lib/medical-document-ocr'
import type { LabResultCategory, PatientRecord } from '@/types/patient'

const FIELD = 'min-h-[44px] w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 py-2 text-base text-[var(--ff-text-primary)]'
const BUTTON = 'min-h-[44px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50'
const CATEGORIES: { value: LabResultCategory; zh: string; en: string }[] = [
  { value: 'blood-routine', zh: '血常规', en: 'Blood count' },
  { value: 'blood-biochemistry', zh: '血生化', en: 'Blood chemistry' },
  { value: 'tumor-marker', zh: '肿瘤标志物', en: 'Tumor markers' },
]
const ISSUES: Record<LabReviewIssue, { zh: string; en: string }> = {
  indicator: { zh: '请选择指标', en: 'Select an indicator' },
  value: { zh: '请输入有效数值', en: 'Enter a valid number' },
  date: { zh: '请填写完整有效日期', en: 'Enter a valid full date' },
  reference: { zh: '参考范围须为数字，且下限不大于上限', en: 'Use numeric limits with lower ≤ upper' },
}
const READING_STATUS = {
  normal: { zh: '范围内', en: 'In range' }, high: { zh: '偏高', en: 'High' },
  low: { zh: '偏低', en: 'Low' }, 'reference-missing': { zh: '缺参考范围', en: 'Reference missing' },
}

type LabReportImportProps = {
  disabled: boolean
  record: PatientRecord | null
  theme: 'light' | 'dark'
  onActiveChange: (active: boolean) => void
  onSaved: (patientId: string) => Promise<void>
}

type ReportDraft = {
  id: string
  file: File
  category: LabResultCategory
  ocrText: string
  rows: LabReviewRow[]
  phase: 'queued' | 'ocr' | 'review' | 'save' | 'committed'
  error: string | null
  duplicate: boolean
}

export function LabReportImport({ disabled, record, theme, onActiveChange, onSaved }: LabReportImportProps) {
  const demo = useDemoSession()
  const productPath = useProductPath()
  const { locale } = useLocale()
  const [uploadCategory, setUploadCategory] = useState<LabResultCategory>('blood-routine')
  const [queue, setQueue] = useState<ReportDraft[]>([])
  const queueRef = useRef<ReportDraft[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const generationRef = useRef(0)
  const refreshRef = useRef<Promise<void> | null>(null)
  const alive = useRef(true)
  const patientId = record?.id
  const selected = queue.find((entry) => entry.id === selectedId)
  const { file, ocrText = '', rows = [], phase = 'idle', error, duplicate = false, category = uploadCategory } = selected ?? {}
  const busy = refreshing || queue.some((entry) => ['queued', 'ocr', 'save'].includes(entry.phase))
  const includedRows = rows.filter((row) => row.include)
  const mixedDates = new Set(includedRows.map((row) => row.testDate)).size > 1
  const blocked = includedRows.length === 0 || hasBlockingReviewRows(rows, category) || mixedDates
  const indicators = getLabIndicatorsByCategory(category)

  function replaceQueue(next: ReportDraft[]) {
    queueRef.current = next
    setQueue(next)
  }

  function updateDraft(id: string, patch: Partial<ReportDraft>) {
    replaceQueue(queueRef.current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry))
  }

  useEffect(() => {
    alive.current = true
    generationRef.current += 1
    queueRef.current = []
    setQueue([])
    setSelectedId(null)
    setRefreshing(false)
    setRefreshError(null)
    setSaved(false)
    refreshRef.current = null
    onActiveChange(false)
    return () => { alive.current = false; generationRef.current += 1; onActiveChange(false) }
  }, [onActiveChange, patientId])

  function discard() {
    generationRef.current += 1
    replaceQueue([])
    setSelectedId(null)
    setRefreshError(null)
    setRefreshing(false)
    refreshRef.current = null
    onActiveChange(false)
  }

  async function recognizeDraft(draft: ReportDraft, generation: number) {
    updateDraft(draft.id, { phase: 'ocr', error: null, duplicate: false })
    try {
      const result = demo ? { text: getDemoLabOcrText(draft.category, draft.file.name.includes('2')) } : await recognizeMedicalDocument(draft.file)
      if (!alive.current || generation !== generationRef.current) return
      updateDraft(draft.id, { ocrText: result.text, rows: extractLabReportReviewRows(result.text, draft.category), phase: 'review' })
    } catch (cause) {
      if (!alive.current || generation !== generationRef.current) return
      updateDraft(draft.id, { error: getMedicalDocumentOcrMessage(cause, locale), phase: 'review' })
    }
  }

  async function recognizeFiles(files: File[]) {
    if (!patientId || disabled || queueRef.current.length || files.length === 0) return
    const generation = ++generationRef.current
    const drafts: ReportDraft[] = files.map((file) => ({ id: crypto.randomUUID(), file, category: uploadCategory, ocrText: '', rows: [], phase: 'queued', error: null, duplicate: false }))
    replaceQueue(drafts)
    setSelectedId(drafts[0].id)
    setSaved(false)
    setRefreshError(null)
    onActiveChange(true)
    for (const draft of drafts) {
      if (!alive.current || generation !== generationRef.current) return
      await recognizeDraft(draft, generation)
    }
  }

  function updateRows(nextRows: LabReviewRow[]) {
    if (!selected || busy || selected.phase === 'committed') return
    updateDraft(selected.id, { rows: nextRows, error: null, duplicate: false })
  }

  function updateRow(id: string, patch: Partial<LabReviewRow>) {
    updateRows(rows.map((row) => row.id === id ? { ...row, ...patch } : row))
  }

  function refreshSavedRecord(): Promise<void> {
    if (refreshRef.current) return refreshRef.current
    if (!patientId || queueRef.current.some((entry) => ['queued', 'ocr', 'save'].includes(entry.phase))) return Promise.resolve()
    const generation = generationRef.current
    setRefreshing(true)
    setRefreshError(null)
    const promise = (async () => {
      try {
        await onSaved(patientId)
        if (!alive.current || generation !== generationRef.current) return
        if (queueRef.current.every((entry) => entry.phase === 'committed')) {
          discard()
          setSaved(true)
        } else {
          setSelectedId(queueRef.current.find((entry) => entry.phase !== 'committed')?.id ?? null)
        }
      } catch {
        if (alive.current && generation === generationRef.current) setRefreshError(locale === 'zh' ? '报告已保存，当前病历读取失败。请重试刷新。' : 'Report saved, but the record could not be refreshed. Retry the refresh.')
      } finally {
        if (alive.current && generation === generationRef.current) setRefreshing(false)
        if (generation === generationRef.current) refreshRef.current = null
      }
    })()
    refreshRef.current = promise
    return promise
  }

  async function save(replaceExisting = false) {
    if (!patientId || !selected || disabled || busy || phase === 'committed' || blocked || (replaceExisting && !duplicate)) return
    const generation = generationRef.current
    const draftId = selected.id
    updateDraft(draftId, { phase: 'save', error: null })
    try {
      const result = await (demo ? demo.session.saveLabBatch : saveLabReportBatch)({
        batch: { patientId, category, testDate: includedRows[0].testDate, sourceFileName: file?.name, sourceMimeType: file?.type, ocrText, reviewStatus: 'confirmed' },
        readings: toConfirmedLabReadings(rows, category),
        replaceExisting,
      })
      if (!alive.current || generation !== generationRef.current) return
      if (result.status === 'duplicate') {
        updateDraft(draftId, { duplicate: true, phase: 'review' })
        return
      }
      updateDraft(draftId, { duplicate: false, phase: 'committed' })
      await refreshSavedRecord()
    } catch {
      if (!alive.current || generation !== generationRef.current) return
      updateDraft(draftId, { error: locale === 'zh' ? '未能保存化验报告，已保留审核内容。请重试保存。' : 'Could not save the report. Your review is preserved; retry saving.', phase: 'review' })
    }
  }

  function textField(row: LabReviewRow, index: number, key: 'value' | 'unit' | 'referenceLow' | 'referenceHigh' | 'testDate', label: string) {
    return <input aria-label={`${label} ${index + 1}`} className={FIELD} inputMode={key === 'testDate' || key === 'unit' ? undefined : 'decimal'} onChange={(event) => updateRow(row.id, { [key]: event.target.value })} type={key === 'testDate' ? 'date' : 'text'} value={row[key]} />
  }

  function reviewStatus(row: LabReviewRow) {
    if (!row.include) return locale === 'zh' ? '已排除' : 'Excluded'
    const issues = getLabReviewIssues(row, category)
    if (issues.length) return issues.map((issue) => ISSUES[issue][locale]).join('；')
    const reading = toConfirmedLabReadings([row], category)[0]
    return READING_STATUS[classifyLabReading(reading)][locale]
  }

  return (
    <ActionSurface className="p-4 sm:p-6" theme={theme}>
      <h2 className="text-lg font-bold">{locale === 'zh' ? '上传化验报告' : 'Upload a lab report'}</h2>
      {patientId ? <p className="mt-2 break-words text-sm">{locale === 'zh' ? '当前患者：' : 'Patient: '}<Link className="font-semibold text-[var(--ff-accent-text)] underline" to={productPath(`/record/${patientId}`)}>{record?.basicInfo?.name || record?.basicInfo?.tumorType || (locale === 'zh' ? '未填写姓名' : 'Unnamed patient')}</Link></p> : <p className="mt-2 text-sm text-[var(--ff-text-secondary)]">{locale === 'zh' ? '请先提取并保存病历，再为这位患者上传化验报告。' : 'Save a patient record before uploading their lab report.'}</p>}
      {saved ? <p className="mt-3 text-sm text-[var(--ff-accent-success)]" role="status">{locale === 'zh' ? '化验报告已保存。' : 'Lab report saved.'}</p> : null}
      <fieldset className="mt-4 flex flex-wrap items-end gap-3" disabled={!patientId || disabled || queue.length > 0}>
        <label className="min-w-40 text-sm">{locale === 'zh' ? '报告类型' : 'Report type'}<select className={`${FIELD} mt-1`} onChange={(event) => setUploadCategory(event.target.value as LabResultCategory)} value={uploadCategory}>{CATEGORIES.map((entry) => <option key={entry.value} value={entry.value}>{entry[locale]}</option>)}</select></label>
        {demo ? <div className="min-w-0 flex-1 text-sm"><button className={`${FIELD} min-h-[44px] font-semibold`} onClick={() => void recognizeFiles([new File([''], '虚构化验1.txt'), new File([''], '虚构化验2.txt')])} type="button">{locale === 'zh' ? '载入两份固定识别示例' : 'Load two fixed OCR examples'}</button><p className="mt-2">{locale === 'zh' ? '不会读取或上传文件。可体验逐份核对、保存和重复报告确认。' : 'No files are read or uploaded. Review, save, and duplicate checks use fixed examples.'}</p></div> : (<label className="min-w-0 flex-1 text-sm">{locale === 'zh' ? '报告图片或 PDF' : 'Report image or PDF'}<input accept="image/*,application/pdf" className={`${FIELD} mt-1`} multiple onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void recognizeFiles(files) }} type="file" /></label>)}
      </fieldset>
      {queue.length > 1 ? <div aria-label={locale === 'zh' ? '报告队列' : 'Report queue'} className="mt-4 flex flex-wrap gap-2">{queue.map((entry) => <button aria-pressed={entry.id === selectedId} className={BUTTON} key={entry.id} onClick={() => setSelectedId(entry.id)} type="button">{entry.file.name} · {entry.phase === 'committed' ? (locale === 'zh' ? '已保存' : 'Saved') : entry.error ? (locale === 'zh' ? '失败，可重试' : 'Failed, retry available') : entry.phase === 'review' ? (locale === 'zh' ? '待审核' : 'Review') : (locale === 'zh' ? '处理中' : 'Processing')}</button>)}</div> : null}
      {refreshError ? <p className="mt-3 text-sm text-[var(--ff-critical)]" role="alert">{refreshError}</p> : null}
      {busy ? <p className="mt-3 text-sm" role="status">{refreshing ? (locale === 'zh' ? '正在刷新病历…' : 'Refreshing the record…') : queue.some((entry) => entry.phase === 'ocr') ? (locale === 'zh' ? '正在识别化验报告…' : 'Reading the report…') : (locale === 'zh' ? '正在保存…' : 'Saving…')}</p> : null}
      {error ? <p className="mt-3 text-sm text-[var(--ff-critical)]" role="alert">{error}</p> : null}
      {phase !== 'idle' && ocrText ? <>
        <label className="mt-4 block max-w-xs text-sm">{locale === 'zh' ? '当前报告类型' : 'Selected report type'}<select className={`${FIELD} mt-1`} disabled={busy || phase === 'committed'} onChange={(event) => { if (selected) { const nextCategory = event.target.value as LabResultCategory; updateDraft(selected.id, { category: nextCategory, rows: extractLabReportReviewRows(ocrText, nextCategory), duplicate: false, error: null }) } }} value={category}>{CATEGORIES.map((entry) => <option key={entry.value} value={entry.value}>{entry[locale]}</option>)}</select></label>
        <details className="mt-4 text-sm"><summary className="cursor-pointer py-2">{locale === 'zh' ? '查看原始 OCR 文本' : 'View original OCR text'}</summary><pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words py-2 font-[var(--ff-font-ui)]">{ocrText}</pre></details>
        <fieldset disabled={busy || phase === 'committed'}>
          <label className="mt-3 block max-w-xs text-sm">{locale === 'zh' ? '统一检查日期' : 'Set all reading dates'}<input className={`${FIELD} mt-1`} onChange={(event) => updateRows(rows.map((row) => ({ ...row, testDate: event.target.value })))} type="date" /></label>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-sm">
              <caption className="sr-only">{locale === 'zh' ? '化验指标审核' : 'Review lab readings'}</caption>
              <thead><tr>{(locale === 'zh' ? ['保存', '指标', '数值', '单位', '参考下限', '参考上限', '检查日期'] : ['Include', 'Indicator', 'Value', 'Unit', 'Lower limit', 'Upper limit', 'Test date']).map((label) => <th className="px-2 py-2 font-semibold" key={label}>{label}</th>)}</tr></thead>
              <tbody>{rows.map((row, index) => <tr className="border-t border-[var(--ff-border-default)] align-top" key={row.id}>
                <td className="px-2 py-2"><label className="flex min-h-[44px] items-center"><input aria-label={`${locale === 'zh' ? '保存第' : 'Include row'} ${index + 1} ${locale === 'zh' ? '行' : ''}`} checked={row.include} onChange={(event) => updateRow(row.id, { include: event.target.checked })} type="checkbox" /></label></td>
                <td className="min-w-64 px-2 py-2"><select aria-label={`${locale === 'zh' ? '指标' : 'Indicator'} ${index + 1}`} className={FIELD} onChange={(event) => { const item = indicators.find((entry) => entry.code === event.target.value); updateRow(row.id, { itemCode: item?.code ?? '', itemName: item?.name ?? row.itemName, unit: item?.unit ?? '', referenceLow: String(item?.referenceLow ?? ''), referenceHigh: String(item?.referenceHigh ?? ''), status: item ? 'mapped' : 'needs-review' }) }} value={row.itemCode}><option value="">{locale === 'zh' ? '请选择指标或排除此行' : 'Select an indicator or exclude'}</option>{indicators.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><p className="mt-1 max-w-sm break-words text-[var(--ff-text-secondary)]">{row.rawText}</p><p className={`mt-1 ${getLabReviewIssues(row, category).length ? 'text-[var(--ff-critical)]' : 'text-[var(--ff-text-secondary)]'}`}>{reviewStatus(row)}</p></td>
                <td className="min-w-28 px-2 py-2">{textField(row, index, 'value', locale === 'zh' ? '数值' : 'Value')}</td>
                <td className="min-w-28 px-2 py-2">{textField(row, index, 'unit', locale === 'zh' ? '单位' : 'Unit')}</td>
                <td className="min-w-28 px-2 py-2">{textField(row, index, 'referenceLow', locale === 'zh' ? '参考下限' : 'Lower limit')}</td>
                <td className="min-w-28 px-2 py-2">{textField(row, index, 'referenceHigh', locale === 'zh' ? '参考上限' : 'Upper limit')}</td>
                <td className="min-w-44 px-2 py-2">{textField(row, index, 'testDate', locale === 'zh' ? '检查日期' : 'Test date')}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </fieldset>
        {rows.length === 0 ? <p className="mt-3 text-sm" role="status">{locale === 'zh' ? '未找到可审核指标，请更换报告重试。' : 'No reviewable readings found. Try another report.'}</p> : null}
        {mixedDates ? <p className="mt-3 text-sm text-[var(--ff-critical)]" role="alert">{locale === 'zh' ? '一次保存对应一个检查日期，请统一日期或排除其他日期的行。' : 'Use one test date per report, or exclude rows from other dates.'}</p> : null}
      </> : null}
      {duplicate ? <div className="mt-4 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] p-4" role="alert">
        <p className="text-sm">{locale === 'zh' ? `这位患者已有 ${includedRows[0]?.testDate} 的${CATEGORIES.find((entry) => entry.value === category)?.zh}报告。替换会覆盖该批次的原有读数。` : 'This patient already has a report for this category and date. Replacing it overwrites that batch’s readings.'}</p>
        <div className="mt-3 flex flex-wrap gap-2"><button className={BUTTON} disabled={busy} onClick={() => selected && updateDraft(selected.id, { duplicate: false })} type="button">{locale === 'zh' ? '取消替换' : 'Cancel replacement'}</button><button className={BUTTON} disabled={busy || blocked} onClick={() => void save(true)} type="button">{locale === 'zh' ? '确认替换已有批次' : 'Replace existing batch'}</button></div>
      </div> : null}
      {phase !== 'idle' ? <div className="mt-4 flex flex-wrap gap-2">
        {phase === 'committed' ? <button className={BUTTON} disabled={busy} onClick={() => void refreshSavedRecord()} type="button">{locale === 'zh' ? '重试刷新病历' : 'Retry record refresh'}</button> : <>
          <button className={BUTTON} disabled={busy} onClick={discard} type="button">{locale === 'zh' ? '取消本次上传' : 'Cancel upload'}</button>
          {!ocrText && file ? <button className={BUTTON} disabled={busy} onClick={() => selected && void recognizeDraft(selected, generationRef.current)} type="button">{locale === 'zh' ? '重试识别' : 'Retry recognition'}</button> : null}
          {!duplicate && ocrText ? <button className={`${BUTTON} bg-[var(--ff-accent-primary)] text-[var(--ff-accent-foreground)]`} disabled={disabled || busy || blocked} onClick={() => void save()} type="button">{locale === 'zh' ? '确认并保存化验报告' : 'Confirm and save lab report'}</button> : null}
        </>}
      </div> : null}
    </ActionSurface>
  )
}

function getDemoLabOcrText(category: LabResultCategory, second: boolean) {
  const date = second ? '2026-10-03' : '2026-10-02'
  const rows = category === 'blood-routine' ? '白细胞计数 WBC 6.1 10^9/L 3.5-9.5\n血红蛋白 HGB 126 g/L 115-150' : category === 'blood-biochemistry' ? '丙氨酸氨基转移酶 ALT 32 U/L 7-40\n白蛋白 ALB 43 g/L 40-55' : '癌胚抗原 CEA 4.2 ng/mL 0-5\n糖类抗原 CA125 21 U/mL 0-35'
  return `检查日期：${date}\n${rows}`
}
