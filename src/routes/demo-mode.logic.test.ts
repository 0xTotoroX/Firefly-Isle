import { describe, expect, it } from 'vitest'
import { loadDemoPatientRecord } from './demo-mode.logic'

describe('public demo source', () => {
  it('always returns an independent fictional fixture', async () => {
    const first = await loadDemoPatientRecord()
    first.record.basicInfo!.name = 'Edited'
    const next = await loadDemoPatientRecord()
    expect(next.source).toBe('fixture')
    expect(next.record.basicInfo?.name).toBe('示例患者丙')
    expect(next.record.id).toBe('demo-relapsed')
  })
})
