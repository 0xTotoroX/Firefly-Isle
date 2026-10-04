/**
 * [INPUT]: createDemoSession/getDemoDashboard、虚构患者和领域类型。
 * [OUTPUT]: 三种模型、跨读取者编辑、症状/随访、化验替换和重置回归。
 * [POS]: 演示唯一内存状态的行为测试，不读真实账户或服务。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'
import { createDemoSession, getDemoDashboard } from './demo-session'
import { getPatientArchetype } from '@/types/patient'

describe('fictional demo session', () => {
  it('covers all patient shapes and keeps edits across independent readers', async () => {
    const session = createDemoSession()
    expect(session.getState().records.map(getPatientArchetype)).toEqual(['non-advanced', 'de-novo-advanced', 'relapsed-advanced'])
    const record = await session.loadRecord('demo-early')
    record.basicInfo!.name = '演示改名'
    await session.saveRecord(record)
    expect((await session.loadRecord('demo-early')).basicInfo?.name).toBe('演示改名')
    expect((await session.loadRecord('demo-initial')).basicInfo?.name).toBe('示例患者乙')
    record.basicInfo!.name = '未保存的改名'
    expect((await session.loadRecord('demo-early')).basicInfo?.name).toBe('演示改名')
  })

  it('updates symptoms, follow-ups and dashboard from one session and restores on reset', async () => {
    const session = createDemoSession()
    const symptom = await session.createSymptom('demo-early', { occurredOn: '2026-10-02', symptom: '演示症状', severity: 'moderate' })
    await session.updateSymptom(symptom.id, { occurredOn: '2026-10-02', symptom: '更新后的症状', severity: 'mild', resolvedOn: '2026-10-03' })
    expect(getDemoDashboard(session.getState()).recentSideEffects[0]).toMatchObject({ symptom: '更新后的症状', ongoing: false })
    const visit = await session.createVisit('demo-early', { visitedOn: '2026-10-02', nextVisitOn: '2026-10-12', conclusion: '演示记录' })
    await session.updateVisit(visit.id, { visitedOn: '2026-10-02', nextVisitOn: '2026-10-13', conclusion: '已核对' })
    expect((await session.loadVisits('demo-early'))[0].conclusion).toBe('已核对')
    expect(getDemoDashboard(session.getState()).nextVisit?.patientId).toBe('demo-early')
    await session.setFollowUpStatus('demo-early', 'paused')
    expect((await session.loadRecord('demo-early')).followUpStatus).toBe('paused')
    await session.deleteSymptom(symptom.id)
    await session.deleteVisit(visit.id)
    expect(await session.loadSymptoms('demo-early')).toEqual([])
    expect(await session.loadVisits('demo-early')).toEqual([])
    session.rememberSymptom('自定义演示症状')
    await session.saveProfile({ displayName: '本次演示' })
    session.reset()
    expect(session.getState().resetVersion).toBe(1)
    expect(session.getState().profile.displayName).toBe('演示账号')
    expect(session.getState().customSymptoms).toEqual([])
    expect((await session.loadRecord('demo-early')).followUpStatus).toBe('completed')
  })

  it('confirms duplicate lab batches and replaces only the selected patient/date/category', async () => {
    const session = createDemoSession()
    const originalCount = getDemoDashboard(session.getState()).labReadingCount
    const input = { batch: { patientId: 'demo-early', category: 'blood-routine' as const, testDate: '2026-10-02' }, readings: [{ category: 'blood-routine' as const, itemCode: 'WBC', itemName: '白细胞计数', value: 6.1 }] }
    expect((await session.saveLabBatch(input)).status).toBe('saved')
    expect((await session.saveLabBatch(input)).status).toBe('duplicate')
    expect(getDemoDashboard(session.getState()).labReadingCount).toBe(originalCount + 1)
    await session.saveLabBatch({ ...input, replaceExisting: true, readings: [{ ...input.readings[0], value: 6.8 }] })
    const record = await session.loadRecord('demo-early')
    expect(record.labResults?.filter((reading) => reading.testDate === '2026-10-02')).toHaveLength(1)
    expect(record.labResults?.at(-1)?.value).toBe(6.8)
    expect((await session.loadRecord('demo-initial')).labResults).toHaveLength(9)
    expect(getDemoDashboard(session.getState()).labReadingCount).toBe(originalCount + 1)
  })

  it('keeps new records local and a new session starts with the original fixtures', async () => {
    const session = createDemoSession()
    const record = await session.saveRecord({ basicInfo: { name: '新增演示' }, treatmentLines: [] })
    expect(record.id).toMatch(/^demo-patient-/)
    expect((await session.loadRecord(record.id!)).basicInfo?.name).toBe('新增演示')
    expect(getDemoDashboard(session.getState()).patientCount).toBe(4)
    expect(createDemoSession().getState().records).toHaveLength(3)
  })
})
