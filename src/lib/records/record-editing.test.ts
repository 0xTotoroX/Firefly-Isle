/**
 * [INPUT]: 依赖 vitest 的 LLM mock，依赖 ./record-editing 的自然语言病历编辑解析与 merge 工具。
 * [OUTPUT]: 对外提供 basicInfo、initialOnset、treatmentLine、清空字段、带单位数值、无效目标与提示词合同回归测试。
 * [POS]: lib/records 的 conversational editing 纯逻辑测试，约束自然语言编辑只修改显式目标字段，并允许身高体重等数值字段携带展示单位。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PatientRecord } from '@/types/patient'

const llmMocks = vi.hoisted(() => ({
  chat: vi.fn(),
}))

vi.mock('@/lib/llm', () => ({
  chat: llmMocks.chat,
}))

import {
  applyPatientRecordEdits,
  buildRecordEditPrompt,
  extractPatientRecordEdits,
  parsePatientRecordEditResponse,
} from './record-editing'

const baseRecord: PatientRecord = {
  basicInfo: {
    age: 63,
    diagnosisDate: '2023-04',
    stage: 'III',
    tumorType: '肺腺癌',
  },
  initialOnset: {
    treatment: '手术',
    triggerDate: '2023-04',
  },
  labResults: [
    { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2024-02-01', value: 8.2 },
  ],
  treatmentLines: [
    { endDate: '2024-02', lineNumber: 1, regimen: '奥希替尼', startDate: '2023-05' },
    { lineNumber: 2, regimen: '化疗', startDate: '2024-03' },
  ],
}

describe('conversational PatientRecord editing', () => {
  beforeEach(() => {
    llmMocks.chat.mockReset()
  })

  it('applies a basicInfo edit without overwriting omitted fields', () => {
    const edits = parsePatientRecordEditResponse(
      '{"edits":[{"target":{"section":"basicInfo","field":"stage"},"value":"IV"}]}',
      baseRecord,
    )

    expect(applyPatientRecordEdits(baseRecord, edits)).toMatchObject({
      basicInfo: {
        age: 63,
        stage: 'IV',
        tumorType: '肺腺癌',
      },
      labResults: baseRecord.labResults,
    })
  })

  it('applies an initialOnset edit', () => {
    const edits = parsePatientRecordEditResponse(
      '{"edits":[{"target":{"section":"initialOnset","field":"treatment"},"value":"术后辅助化疗"}]}',
      baseRecord,
    )

    expect(applyPatientRecordEdits(baseRecord, edits).initialOnset).toMatchObject({
      treatment: '术后辅助化疗',
      triggerDate: '2023-04',
    })
  })

  it('applies treatmentLine regimen, startDate, and endDate edits to the targeted line only', () => {
    const edits = parsePatientRecordEditResponse(
      JSON.stringify({
        edits: [
          { target: { field: 'regimen', lineNumber: 2, section: 'treatmentLine' }, value: '培美曲塞 + 卡铂' },
          { target: { field: 'startDate', lineNumber: 2, section: 'treatmentLine' }, value: '2024-04' },
          { target: { field: 'endDate', lineNumber: 2, section: 'treatmentLine' }, value: '2024-08' },
        ],
      }),
      baseRecord,
    )

    const next = applyPatientRecordEdits(baseRecord, edits)

    expect(next.treatmentLines[0]).toEqual(baseRecord.treatmentLines[0])
    expect(next.treatmentLines[1]).toMatchObject({
      endDate: '2024-08',
      lineNumber: 2,
      regimen: '培美曲塞 + 卡铂',
      startDate: '2024-04',
    })
  })

  it('clears a field when the edit value is null or empty', () => {
    const edits = parsePatientRecordEditResponse(
      '{"edits":[{"target":{"section":"treatmentLine","lineNumber":1,"field":"endDate"},"value":null}]}',
      baseRecord,
    )

    expect(applyPatientRecordEdits(baseRecord, edits).treatmentLines[0]).toMatchObject({
      endDate: undefined,
      lineNumber: 1,
      regimen: '奥希替尼',
    })
  })

  it('keeps numeric basicInfo edits when the value includes display units', () => {
    const edits = parsePatientRecordEditResponse(
      '{"edits":[{"target":{"section":"basicInfo","field":"height"},"value":"168 cm"},{"target":{"section":"basicInfo","field":"weight"},"value":"62 kg"}]}',
      baseRecord,
    )

    expect(applyPatientRecordEdits(baseRecord, edits).basicInfo).toMatchObject({
      height: 168,
      weight: 62,
    })
  })

  it('applies patient name and clinical notes edits through the same field target boundary', () => {
    const edits = parsePatientRecordEditResponse(
      JSON.stringify({
        edits: [
          { target: { field: 'name', section: 'basicInfo' }, value: '林某' },
          { target: { field: 'clinicalNotes', section: 'record' }, value: '其他信息：患者自述乏力。' },
        ],
      }),
      baseRecord,
    )

    expect(applyPatientRecordEdits(baseRecord, edits)).toMatchObject({
      basicInfo: {
        name: '林某',
      },
      clinicalNotes: '其他信息：患者自述乏力。',
    })
  })

  it('rejects invalid fields, invalid treatment line numbers, and empty edit arrays', () => {
    expect(() =>
      parsePatientRecordEditResponse('{"edits":[{"target":{"section":"basicInfo","field":"regimen"},"value":"X"}]}', baseRecord),
    ).toThrow('Invalid edit target')

    expect(() =>
      parsePatientRecordEditResponse('{"edits":[{"target":{"section":"treatmentLine","lineNumber":9,"field":"regimen"},"value":"X"}]}', baseRecord),
    ).toThrow('Invalid treatment line')

    expect(() => parsePatientRecordEditResponse('{"edits":[]}', baseRecord)).toThrow('No valid edits')
  })

  it('builds a field-level edit prompt and requests JSON object output', async () => {
    llmMocks.chat.mockResolvedValue('{"edits":[{"target":{"section":"basicInfo","field":"stage"},"value":"IV"}]}')

    await extractPatientRecordEdits('把分期改成 IV', baseRecord)

    expect(llmMocks.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('field-level edit intents'),
        }),
      ]),
      { responseFormat: 'json_object' },
    )
    expect(buildRecordEditPrompt('删除错误结束日期', baseRecord)).toContain('PatientFieldTarget')
  })
})
