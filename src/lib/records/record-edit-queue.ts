/**
 * [INPUT]: PatientRecord、字段 patch 合并和调用者注入的异步持久化函数。
 * [OUTPUT]: createRecordEditQueue，提供串行 enqueue 与 pending 计数。
 * [POS]: lib/records 的病历/账号范围的编辑队列；下一次 patch 基于最后成功保存的记录，失败不阻塞后续任务。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { applyPatientRecordEdits, type PatientRecordEdit } from '@/lib/records/record-editing'
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
