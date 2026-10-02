import { describe, expect, it } from 'vitest'
import { mergePatientRecord, normalizePatientRecord } from './extraction'
import type { PatientRecord } from '@/types/patient'
const record: PatientRecord = {
  id: 'patient', followUpStatus: 'paused',
  treatmentLines: [{ id: 'line', lineNumber: 1, regimen: 'Existing' }],
  labResults: [{ id: 'reading', batchId: 'batch', testDate: '2026-10-01', category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', value: 6, unit: 'ng/mL' }],
}
describe('trusted record identity', () => {
  it('keeps persisted identities, provenance and follow-up status during field normalization', () => {
    expect(normalizePatientRecord(record)).toMatchObject(record)
  })
  it('strips model-supplied patient, child and batch identities', () => {
    const result = normalizePatientRecord(record, { preserveId: false })
    expect(result.id).toBeUndefined()
    expect(result.followUpStatus).toBeUndefined()
    expect(result.treatmentLines[0].id).toBeUndefined()
    expect(result.labResults?.[0].id).toBeUndefined()
    expect(result.labResults?.[0].batchId).toBeUndefined()
  })
  it('keeps existing IDs when follow-up restates a line and identical dated reading', () => {
    const result = mergePatientRecord(record, { ...record, treatmentLines: [{ id: 'spoofed', lineNumber: 1, regimen: 'Updated' }] })
    expect(result.treatmentLines[0]).toMatchObject({ id: 'line', regimen: 'Updated' })
    expect(result.labResults).toHaveLength(1)
    expect(result.labResults).toMatchObject(record.labResults!)
    expect(result.followUpStatus).toBe('paused')
  })
  it('keeps distinct values and units on the same day for manual review', () => {
    const reading = record.labResults![0]
    const result = mergePatientRecord(record, { labResults: [{ ...reading, value: 8 }, { ...reading, unit: 'other' }] })
    expect(result.labResults).toHaveLength(3)
  })
})
