/**
 * [INPUT]: PatientRecord 与随访、症状类型。
 * [OUTPUT]: 完全虚构的三种病历、化验、随访和症状示例。
 * [POS]: 公开演示的固定起始数据，不含真实患者资料。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { FollowUpVisit } from '@/lib/follow-up-storage'
import type { SideEffectRecord } from '@/lib/side-effect-storage'
import type { LabReportBatch, LabResult, PatientRecord } from '@/types/patient'

export const DEMO_DEFAULT_PATIENT_ID = 'demo-relapsed'
export const DEMO_DISCLOSURE = '虚构资料 · 修改只在本次演示中保留，不写入真实账户；刷新或重置后恢复。AI 与识别均为固定示例。'

function labs(patientId: string, offset: number): LabResult[] {
  return ['2026-08-12', '2026-09-12', '2026-10-01'].flatMap((testDate, index) => [
    { id: `${patientId}-wbc-${index}`, batchId: `${patientId}-routine-${index}`, patientId, testDate, category: 'blood-routine' as const, itemCode: 'wbc', itemName: '白细胞', value: 5.3 - index * 0.6 + offset, unit: '10^9/L', referenceLow: 3.5, referenceHigh: 9.5, source: 'test' as const },
    { id: `${patientId}-alt-${index}`, batchId: `${patientId}-chemistry-${index}`, patientId, testDate, category: 'blood-biochemistry' as const, itemCode: 'alt', itemName: '丙氨酸氨基转移酶', value: 25 + index * 8 + offset, unit: 'U/L', referenceLow: 7, referenceHigh: 40, source: 'test' as const },
    { id: `${patientId}-cea-${index}`, batchId: `${patientId}-marker-${index}`, patientId, testDate, category: 'tumor-marker' as const, itemCode: 'cea', itemName: '癌胚抗原（CEA）', value: 3.2 + index * 0.5 + offset, unit: 'ng/mL', referenceLow: 0, referenceHigh: 5, source: 'test' as const },
  ])
}

export function createDemoRecords(): PatientRecord[] {
  return [
    { id: 'demo-early', basicInfo: { name: '示例患者甲', gender: '女', age: 42, tumorType: '乳腺肿瘤（虚构示例）', stage: 'I 期（示例）', diagnosisDate: '2026-05-10' }, initialOnset: { triggerDate: '2026-05-10', treatment: '示例初始治疗 A（虚构）', immunohistochemistry: '示例报告待核对', geneticTest: '未提供' }, treatmentLines: [], followUpStatus: 'completed', clinicalNotes: '完全虚构，用于体验仅有初始治疗的病历。', labResults: labs('demo-early', 0) },
    { id: 'demo-initial', basicInfo: { name: '示例患者乙', gender: '男', age: 58, tumorType: '肺部肿瘤（虚构示例）', stage: 'IV 期（示例）', diagnosisDate: '2026-04-16' }, treatmentLines: [{ id: 'demo-initial-line-1', lineNumber: 1, startDate: '2026-04-20', endDate: '2026-07-31', regimen: '示例方案 B（虚构）', geneticTest: '示例检测结果待核对' }, { id: 'demo-initial-line-2', lineNumber: 2, startDate: '2026-08-10', regimen: '示例方案 C（虚构）', immunohistochemistry: '示例报告待核对' }], followUpStatus: 'treating', clinicalNotes: '完全虚构，用于体验确诊时已有多线治疗的病历。', labResults: labs('demo-initial', 1) },
    { id: DEMO_DEFAULT_PATIENT_ID, basicInfo: { name: '示例患者丙', gender: '女', age: 51, tumorType: '消化道肿瘤（虚构示例）', stage: '复发期（示例）', diagnosisDate: '2025-03-08' }, initialOnset: { triggerDate: '2025-03-08', treatment: '示例初始治疗 D（虚构）', immunohistochemistry: '示例初始报告', geneticTest: '示例初始检测' }, treatmentLines: [{ id: 'demo-relapsed-line-1', lineNumber: 1, startDate: '2026-02-10', endDate: '2026-06-30', regimen: '示例方案 E（虚构）', geneticTest: '示例复查结果' }, { id: 'demo-relapsed-line-2', lineNumber: 2, startDate: '2026-07-15', regimen: '示例方案 F（虚构）', biopsy: '示例复发病理，内容待核对' }], followUpStatus: 'treating', clinicalNotes: '完全虚构，用于体验初始治疗、复发和后续治疗的完整记录。所有方案均非医疗建议。', labResults: labs(DEMO_DEFAULT_PATIENT_ID, 2) },
  ]
}

export function createDemoBatches(records: PatientRecord[]): LabReportBatch[] {
  return records.flatMap((record) => (record.labResults ?? []).map((reading) => ({ id: reading.batchId, patientId: record.id, category: reading.category, testDate: reading.testDate, sourceFileName: '虚构化验示例', reviewStatus: 'confirmed' as const })))
}

export function createDemoSymptoms(): SideEffectRecord[] {
  return [{ id: 'demo-symptom-1', patientId: DEMO_DEFAULT_PATIENT_ID, occurredOn: '2026-09-28', symptom: '乏力（虚构示例）', severity: 'mild', notes: '用于体验症状记录，不代表治疗结论。' }]
}

export function createDemoVisits(): FollowUpVisit[] {
  return [{ id: 'demo-visit-1', patientId: DEMO_DEFAULT_PATIENT_ID, visitedOn: '2026-09-26', nextVisitOn: '2026-10-18', location: '示例门诊', doctor: '示例医生', conclusion: '虚构随访记录，供界面演示。', nextPlan: '核对并整理下一次复诊资料。' }]
}

export const DEMO_INTAKE_TEXT = '示例患者丁，45 岁，2026 年 9 月初诊，肿瘤类型为虚构示例，采用示例初始治疗。分期待补充。本段仅用于体验录入与核对。'
export function createDemoExtraction(): PatientRecord {
  return { basicInfo: { name: '示例患者丁', age: 45, tumorType: '肿瘤（虚构示例）', diagnosisDate: '2026-09-01' }, initialOnset: { triggerDate: '2026-09-01', treatment: '示例初始治疗（虚构）' }, treatmentLines: [], clinicalNotes: '固定提取示例，未调用 AI，也未分析输入内容。' }
}
