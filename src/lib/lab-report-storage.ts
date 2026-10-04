/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端入口、patient-record-storage 的实验室批次/读数 mapper，以及 @/types/patient 的 LabReportBatch/LabResult 类型及单事务 RPC。
 * [OUTPUT]: 对外提供 saveLabReportBatch，负责网页端实验室报告批次和关联读数的 Supabase 写入。
 * [POS]: lib 的实验室报告摄入持久化边界，让 analytics route 不直接拼接 lab_report_batches / lab_results 数据库 payload。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { getSupabaseClient } from '@/lib/supabase'
import {
  mapLabReportBatchRow,
  mapLabResultRow,
  toLabReportBatchPayload,
  toLabResultPayload,
  type LabReportBatchRow,
  type LabResultRow,
} from '@/lib/patient-record-storage'
import type { LabReportBatch, LabResult, LabResultCategory } from '@/types/patient'

type SaveLabReportBatchInput = {
  batch: Omit<LabReportBatch, 'category' | 'patientId'> & {
    category: LabResultCategory
    patientId: string
  }
  readings: LabResult[]
  replaceExisting?: boolean
}

type SaveLabReportBatchResult =
  | {
      existingBatch: LabReportBatch
      status: 'duplicate'
    }
  | {
      batch: LabReportBatch
      readings: LabResult[]
      status: 'saved'
    }

export async function saveLabReportBatch(input: SaveLabReportBatchInput): Promise<SaveLabReportBatchResult> {
  const testDate = input.batch.testDate ?? input.readings.find((reading) => reading.testDate)?.testDate
  const { data, error } = await getSupabaseClient().rpc('save_lab_report_batch', {
    batch: toLabReportBatchPayload({ ...input.batch, testDate }, input.batch.patientId),
    readings: input.readings.map((reading) => toLabResultPayload(reading, input.batch.patientId)),
    replace_existing: input.replaceExisting ?? false,
  })
  if (error) throw error
  if (!data?.batch) throw new Error('Lab report was not saved.')
  const batch = mapLabReportBatchRow(data.batch as LabReportBatchRow)
  if (data.status === 'duplicate') return { existingBatch: batch, status: 'duplicate' }
  return { batch, readings: ((data.readings ?? []) as LabResultRow[]).map(mapLabResultRow), status: 'saved' }
}
