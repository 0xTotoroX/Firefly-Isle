/** Serializes field patches against the last successfully saved record. */
import { applyPatientRecordEdits, type PatientRecordEdit } from '@/lib/record-editing'
import type { PatientRecord } from '@/types/patient'

export function createRecordEditQueue(initial: PatientRecord, save: (record: PatientRecord) => Promise<PatientRecord>) {
  let record = initial
  let tail: Promise<unknown> = Promise.resolve()
  let pending = 0
  return {
    get pending() { return pending },
    enqueue(edits: PatientRecordEdit[]) {
      pending += 1
      const result = tail.then(async () => {
        record = await save(applyPatientRecordEdits(record, edits))
        return record
      }).finally(() => { pending -= 1 })
      tail = result.catch(() => undefined)
      return result
    },
  }
}
