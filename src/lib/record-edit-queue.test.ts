import { describe, expect, it, vi } from 'vitest'
import { createRecordEditQueue } from './record-edit-queue'
import type { PatientRecord } from '@/types/patient'

const initial: PatientRecord = { basicInfo: { name: 'Before', age: 40 }, treatmentLines: [{ id: 'stable-line', lineNumber: 1 }] }

describe('record edit serialization', () => {
  it('waits for the first save and applies the next patch to its returned record', async () => {
    let finish!: (record: PatientRecord) => void
    const save = vi.fn<(record: PatientRecord) => Promise<PatientRecord>>()
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
      .mockImplementation(async (record) => record)
    const queue = createRecordEditQueue(initial, save)
    const first = queue.enqueue([{ target: { section: 'basicInfo', field: 'name' }, value: 'After' }])
    const second = queue.enqueue([{ target: { section: 'basicInfo', field: 'age' }, value: '41' }])
    await Promise.resolve()
    expect(save).toHaveBeenCalledTimes(1)
    finish({ ...save.mock.calls[0][0], id: 'database-id' })
    await first
    await expect(second).resolves.toMatchObject({ id: 'database-id', basicInfo: { name: 'After', age: 41 }, treatmentLines: [{ id: 'stable-line' }] })
    expect(queue.pending).toBe(0)
  })

  it('continues after failure using the last saved value instead of the failed patch', async () => {
    const save = vi.fn<(record: PatientRecord) => Promise<PatientRecord>>()
      .mockRejectedValueOnce(new Error('Network failed'))
      .mockImplementation(async (record) => record)
    const queue = createRecordEditQueue(initial, save)
    const first = queue.enqueue([{ target: { section: 'basicInfo', field: 'name' }, value: 'Failed' }])
    const second = queue.enqueue([{ target: { section: 'basicInfo', field: 'age' }, value: '42' }])
    await expect(first).rejects.toThrow('Network failed')
    await expect(second).resolves.toMatchObject({ basicInfo: { name: 'Before', age: 42 } })
  })
})
