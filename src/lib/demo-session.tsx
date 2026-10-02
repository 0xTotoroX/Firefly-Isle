/**
 * [INPUT]: React Context、完全虚构的 fixtures 与现有领域类型。
 * [OUTPUT]: DemoSessionProvider、useDemoSession、useProductPath 和可测试内存会话。
 * [POS]: 演示唯一数据源；跨页面保留 CRUD，不访问存储、认证或远程服务。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { calendarDaysBetween, localCalendarDate } from '@/lib/calendar-date'
import { createDemoBatches, createDemoRecords, createDemoSymptoms, createDemoVisits } from '@/lib/demo-fixtures'
import type { DashboardData } from '@/lib/dashboard-data'
import type { FollowUpVisit, FollowUpVisitInput } from '@/lib/follow-up-storage'
import type { SideEffectInput, SideEffectRecord } from '@/lib/side-effect-storage'
import type { LlmProviderId } from '@/lib/llm/provider-settings'
import type { UserProfileView } from '@/lib/profile-settings'
import type { saveLabReportBatch } from '@/lib/lab-report-storage'
import type { FollowUpStatus, PatientRecord } from '@/types/patient'

type DemoModelPreview = { mode: 'system' | 'preset' | 'custom'; provider: Exclude<LlmProviderId, 'custom_openai'>; model: string; baseUrl: string }

function initialState() {
  const records = createDemoRecords()
  return { records, batches: createDemoBatches(records), symptoms: createDemoSymptoms(), visits: createDemoVisits(), customSymptoms: [] as string[], modelPreview: { mode: 'system', provider: 'openai', model: '', baseUrl: '' } as DemoModelPreview, profile: { displayName: '演示账号', locale: 'zh', theme: 'dark' } as UserProfileView, revision: 0, resetVersion: 0 }
}
export type DemoState = ReturnType<typeof initialState>
const clone = <T,>(value: T): T => structuredClone(value)
const clean = <T extends object>(input: T) => Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value === null ? undefined : value]))

export function createDemoSession(onChange: (state: DemoState) => void = () => {}) {
  let state = initialState()
  let sequence = 0
  const commit = (patch: Partial<DemoState>) => { state = { ...state, ...patch, revision: state.revision + 1 }; onChange(state) }
  const id = (kind: string) => `demo-${kind}-${++sequence}`
  const requireRecord = (patientId: string) => {
    const record = state.records.find((item) => item.id === patientId)
    if (!record) throw new Error('演示病历不存在，请从总览选择病历。')
    return record
  }
  return {
    getState: () => state,
    reset: () => { const resetVersion = state.resetVersion + 1; state = { ...initialState(), resetVersion }; onChange(state) },
    loadRecord: async (patientId: string) => clone(requireRecord(patientId)),
    loadLatestRecord: async () => clone(state.records.at(-1) ?? null),
    saveRecord: async (record: PatientRecord) => {
      const saved = clone({ ...record, id: record.id ?? id('patient') })
      saved.treatmentLines = saved.treatmentLines.map((line) => ({ ...line, id: line.id ?? id('line') }))
      commit({ records: state.records.some((item) => item.id === saved.id) ? state.records.map((item) => item.id === saved.id ? saved : item) : [...state.records, saved] })
      return clone(saved)
    },
    loadSymptoms: async (patientId: string) => clone(state.symptoms.filter((item) => item.patientId === patientId)),
    createSymptom: async (patientId: string, input: SideEffectInput) => {
      requireRecord(patientId)
      const item = { ...clean(input), id: id('symptom'), patientId } as SideEffectRecord
      commit({ symptoms: [item, ...state.symptoms] }); return clone(item)
    },
    updateSymptom: async (itemId: string, input: SideEffectInput) => { commit({ symptoms: state.symptoms.map((item) => item.id === itemId ? { ...item, ...clean(input) } as SideEffectRecord : item) }) },
    deleteSymptom: async (itemId: string) => { commit({ symptoms: state.symptoms.filter((item) => item.id !== itemId) }) },
    loadVisits: async (patientId: string) => clone(state.visits.filter((item) => item.patientId === patientId).sort((a, b) => b.visitedOn.localeCompare(a.visitedOn))),
    createVisit: async (patientId: string, input: FollowUpVisitInput) => {
      requireRecord(patientId)
      const item = { ...clean(input), id: id('visit'), patientId } as FollowUpVisit
      commit({ visits: [item, ...state.visits] }); return clone(item)
    },
    updateVisit: async (itemId: string, input: FollowUpVisitInput) => { commit({ visits: state.visits.map((item) => item.id === itemId ? { ...item, ...clean(input) } as FollowUpVisit : item) }) },
    deleteVisit: async (itemId: string) => { commit({ visits: state.visits.filter((item) => item.id !== itemId) }) },
    setFollowUpStatus: async (patientId: string, status: FollowUpStatus | null) => { requireRecord(patientId); commit({ records: state.records.map((item) => item.id === patientId ? { ...item, followUpStatus: status ?? undefined } : item) }) },
    rememberSymptom: (symptom: string) => { if (!state.customSymptoms.includes(symptom)) commit({ customSymptoms: [...state.customSymptoms, symptom] }) },
    setModelPreview: (modelPreview: DemoModelPreview) => commit({ modelPreview }),
    loadProfile: async () => clone(state.profile),
    saveProfile: async (input: Partial<UserProfileView>) => { commit({ profile: { ...state.profile, ...input } }); return clone(state.profile) },
    saveLabBatch: async (input: Parameters<typeof saveLabReportBatch>[0]): ReturnType<typeof saveLabReportBatch> => {
      const record = requireRecord(input.batch.patientId)
      const testDate = input.batch.testDate ?? input.readings.find((reading) => reading.testDate)?.testDate
      const existing = state.batches.find((batch) => batch.patientId === record.id && batch.category === input.batch.category && batch.testDate === testDate)
      if (existing && !input.replaceExisting) return { status: 'duplicate', existingBatch: clone(existing) }
      const batch = { ...clone(input.batch), id: existing?.id ?? id('batch'), testDate }
      const readings = input.readings.map((reading) => ({ ...clone(reading), id: id('reading'), patientId: record.id, batchId: batch.id, testDate: reading.testDate ?? testDate }))
      commit({ batches: [...state.batches.filter((item) => item.id !== batch.id), batch], records: state.records.map((item) => item.id === record.id ? { ...item, labResults: [...(item.labResults ?? []).filter((reading) => reading.batchId !== batch.id), ...readings] } : item) })
      return { status: 'saved', batch: clone(batch), readings: clone(readings) }
    },
  }
}
export type DemoSession = ReturnType<typeof createDemoSession>
const DemoContext = createContext<{ session: DemoSession; state: DemoState } | null>(null)
export function DemoSessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initialState)
  const [session] = useState(() => createDemoSession(setState))
  const value = useMemo(() => ({ session, state }), [session, state])
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
export function useDemoSession() { return useContext(DemoContext) }
const realPath = (path: string) => path
const demoPath = (path: string) => path.startsWith('/demo') || !path.startsWith('/') ? path : `/demo${path}`
export function useProductPath() { return useDemoSession() ? demoPath : realPath }

export function getDemoDashboard(state: DemoState): DashboardData {
  const latest = new Map<string, NonNullable<PatientRecord['labResults']>[number]>()
  for (const record of state.records) for (const reading of record.labResults ?? []) {
    const key = `${record.id}:${reading.category}:${reading.itemCode}`
    if ((latest.get(key)?.testDate ?? '') <= (reading.testDate ?? '')) latest.set(key, { ...reading, patientId: record.id })
  }
  const visits = state.records.flatMap((record) => state.visits.filter((visit) => visit.patientId === record.id).sort((a, b) => b.visitedOn.localeCompare(a.visitedOn)).slice(0, 1)).filter((visit) => visit.nextVisitOn).sort((a, b) => a.nextVisitOn!.localeCompare(b.nextVisitOn!))
  const next = visits[0]
  return { patientCount: state.records.length, labReadingCount: state.records.reduce((count, record) => count + (record.labResults?.length ?? 0), 0), activeShareCount: 0, aiCallCount30d: 0, unavailableSections: [],
    nextVisit: next?.nextVisitOn ? { patientId: next.patientId, nextVisitOn: next.nextVisitOn, daysUntil: calendarDaysBetween(localCalendarDate(), next.nextVisitOn) } : null,
    recentSideEffects: state.symptoms.slice(0, 5).map((item) => ({ id: item.id, patientId: item.patientId, symptom: item.symptom, severity: item.severity, ongoing: !item.resolvedOn, overdue: false })),
    abnormalReadings: [...latest.values()].filter((item) => (item.referenceHigh !== undefined && item.value > item.referenceHigh) || (item.referenceLow !== undefined && item.value < item.referenceLow)).map((item) => ({ itemId: item.id!, patientId: item.patientId!, itemName: item.itemName, testDate: item.testDate ?? null, unit: item.unit ?? null, value: item.value, reference: `${item.referenceLow ?? '—'}–${item.referenceHigh ?? '—'}`, status: item.referenceHigh !== undefined && item.value > item.referenceHigh ? 'high' : 'low' })),
  }
}
