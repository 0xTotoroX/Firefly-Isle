/**
 * [INPUT]: 依赖 vitest 的 LLM mock，依赖 ./clinical-analysis 的 prompt 构造、JSON 解析和 analyzePatientRecord。
 * [OUTPUT]: 对外提供临床辅助分析对非诊断 prompt、json_object 调用、无 lab 降级和非法响应拒绝的回归测试。
 * [POS]: src/lib 的 clinical-analysis 合同测试，确保 AI 分析只消费 PatientRecord/labResults 并保持非诊断边界。
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
  analyzePatientRecord,
  buildClinicalAnalysisMessages,
  ClinicalAnalysisParseError,
  parseClinicalAnalysisResponse,
} from './clinical-analysis'

const record: PatientRecord = {
  basicInfo: {
    age: 60,
    stage: 'IV',
    tumorType: '乳腺癌',
  },
  labResults: [
    { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2024-02-01', value: 9.2, unit: 'ng/mL' },
  ],
  treatmentLines: [
    { lineNumber: 1, regimen: '氟维司群 + 阿贝西利', startDate: '2023-01' },
  ],
}

describe('clinical analysis', () => {
  beforeEach(() => {
    llmMocks.chat.mockReset()
  })

  it('builds a non-diagnostic prompt from PatientRecord and labResults', () => {
    const messages = buildClinicalAnalysisMessages(record)
    const userPrompt = messages.find((message) => message.role === 'user')?.content ?? ''
    const systemPrompt = messages.find((message) => message.role === 'system')?.content ?? ''

    expect(systemPrompt).toContain('must not diagnose')
    expect(systemPrompt).toContain('Return only JSON')
    expect(userPrompt).toContain('乳腺癌')
    expect(userPrompt).toContain('氟维司群 + 阿贝西利')
    expect(userPrompt).toContain('CEA')
    expect(userPrompt).toContain('禁止编造')
  })

  it('requests JSON object output through the LLM adapter', async () => {
    llmMocks.chat.mockResolvedValue(JSON.stringify({
      attentionPoints: ['复核指标变化'],
      disclaimer: '仅作参考，不构成诊断或治疗建议。',
      followUpQuestions: ['最近一次复查日期？'],
      labTrendSummary: ['CEA 已保存 1 次读数。'],
      treatmentSummary: ['当前记录包含一线治疗。'],
    }))

    await expect(analyzePatientRecord(record)).resolves.toMatchObject({
      labTrendSummary: ['CEA 已保存 1 次读数。'],
      treatmentSummary: ['当前记录包含一线治疗。'],
    })
    expect(llmMocks.chat).toHaveBeenCalledWith(expect.any(Array), { responseFormat: 'json_object' })
  })

  it('downgrades lab analysis when the record has no labResults', () => {
    const result = parseClinicalAnalysisResponse(
      JSON.stringify({
        attentionPoints: ['补充分期'],
        disclaimer: '仅作参考，不构成诊断或治疗建议。',
        followUpQuestions: [],
        labTrendSummary: ['模型不应使用这条'],
        treatmentSummary: ['已有治疗线。'],
      }),
      false,
    )

    expect(result.labTrendSummary).toEqual(['暂无已保存实验室指标，无法生成指标趋势分析。'])
  })

  it('rejects invalid analysis payloads', () => {
    expect(() => parseClinicalAnalysisResponse('not json', true)).toThrow(ClinicalAnalysisParseError)
    expect(() => parseClinicalAnalysisResponse('{"labTrendSummary":[]}', true)).toThrow(ClinicalAnalysisParseError)
  })
})
