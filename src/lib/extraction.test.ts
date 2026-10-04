/**
 * [INPUT]: 依赖 vitest 的 LLM mock，依赖 ./extraction 的 extractPatientRecord 与 getExtractionFailureMessage。
 * [OUTPUT]: 对外提供结构化提取对 LLM JSON 输出模式、模型 id 清洗、密集病史末尾人口学信息补全、紧凑提示词合同、上游失败降级重试、Gemini 兜底、错误文案分流与日期归一化的回归测试。
 * [POS]: src/lib 的提取协议测试，确保病历结构化链路优先要求模型返回 JSON 对象、避免长 TypeScript schema/多消息提示词、接住上游 502、清除未持久化 id、补回模型漏掉的姓名/性别/年龄/身高/体重、区分 Auth/限流/超时/上游失败与中文/点号日期。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const llmMocks = vi.hoisted(() => ({
  chat: vi.fn(),
}))

vi.mock('@/lib/llm', async () => {
  const actual = await vi.importActual<typeof import('@/lib/llm')>('@/lib/llm')
  return {
    ...actual,
    chat: llmMocks.chat,
  }
})

import { ChatError } from '@/lib/llm'

import { ExtractionParseError, extractPatientRecord, getExtractionFailureMessage } from './extraction'

function getUserPrompt(messages: Array<{ role: string; content: string }>) {
  return messages.find((message) => message.role === 'user')?.content ?? ''
}

describe('extractPatientRecord', () => {
  beforeEach(() => {
    llmMocks.chat.mockReset()
    llmMocks.chat.mockResolvedValue('{"treatmentLines":[]}')
  })

  it('requests JSON object output from the LLM adapter', async () => {
    await extractPatientRecord('肺癌 IV 期，使用奥希替尼一线治疗。')

    expect(llmMocks.chat).toHaveBeenCalledWith(expect.any(Array), {
      responseFormat: 'json_object',
    })
  })

  it('retries without JSON mode when the upstream rejects dense histories', async () => {
    llmMocks.chat
      .mockRejectedValueOnce(Object.assign(new Error('deepseek API request failed.'), {
        name: 'LLMUpstreamError',
        status: 502,
      }))
      .mockResolvedValueOnce('{"treatmentLines":[{"lineNumber":1,"regimen":"阿贝西利+氟维司群"}]}')

    await expect(extractPatientRecord('乳腺癌长病史，包含多行治疗表格。')).resolves.toMatchObject({
      treatmentLines: [
        {
          lineNumber: 1,
          regimen: '阿贝西利+氟维司群',
        },
      ],
    })
    expect(llmMocks.chat).toHaveBeenNthCalledWith(1, expect.any(Array), { responseFormat: 'json_object' })
    expect(llmMocks.chat).toHaveBeenNthCalledWith(2, expect.any(Array))
  })

  it('falls back to Gemini when the built-in DeepSeek path rejects dense histories twice', async () => {
    llmMocks.chat
      .mockRejectedValueOnce(new ChatError('LLMUpstreamError', 'deepseek API request failed.', 502))
      .mockRejectedValueOnce(new ChatError('LLMInvalidResponseError', 'LLM proxy returned invalid response.', 502))
      .mockResolvedValueOnce('```json\n{"treatmentLines":[{"lineNumber":9,"regimen":"氟唑帕利+哌柏西利"}]}\n```')

    await expect(extractPatientRecord('乳腺癌长病史，包含 9 线治疗表格。')).resolves.toMatchObject({
      treatmentLines: [
        {
          lineNumber: 9,
          regimen: '氟唑帕利+哌柏西利',
        },
      ],
    })
    expect(llmMocks.chat).toHaveBeenNthCalledWith(1, expect.any(Array), { responseFormat: 'json_object' })
    expect(llmMocks.chat).toHaveBeenNthCalledWith(2, expect.any(Array))
    expect(llmMocks.chat).toHaveBeenNthCalledWith(3, expect.any(Array), {
      provider: 'gemini',
      responseFormat: 'json_object',
    })
  })

  it('keeps extracted lab readings in labResults instead of treatmentLines', async () => {
    llmMocks.chat.mockResolvedValue(
      JSON.stringify({
        labResults: [
          {
            category: 'tumor-marker',
            itemCode: 'cea',
            itemName: 'CEA',
            referenceHigh: '5',
            source: 'ocr',
            testDate: '2024/02/01',
            unit: 'ng/mL',
            value: '8.2',
          },
        ],
        treatmentLines: [],
      }),
    )

    await expect(extractPatientRecord('CEA 8.2 ng/mL，参考值 <5。')).resolves.toMatchObject({
      labResults: [
        {
          itemCode: 'cea',
          referenceHigh: 5,
          source: 'ocr',
          testDate: '2024-02-01',
          value: 8.2,
        },
      ],
      treatmentLines: [],
    })
  })

  it('drops model-generated ids from initial extraction so storage owns persisted record identity', async () => {
    llmMocks.chat.mockResolvedValue(
      JSON.stringify({
        id: '627b6ba7-74b1-4e10-b79b-ad509bb88687',
        basicInfo: {
          stage: 'IV',
          tumorType: '乳腺癌',
        },
        treatmentLines: [{ lineNumber: 1, regimen: '阿贝西利+氟维司群' }],
      }),
    )

    const record = await extractPatientRecord('乳腺癌 IV 期，一线阿贝西利+氟维司群。')

    expect(record.id).toBeUndefined()
    expect(record).toMatchObject({
      basicInfo: {
        stage: 'IV',
        tumorType: '乳腺癌',
      },
      treatmentLines: [{ lineNumber: 1, regimen: '阿贝西利+氟维司群' }],
    })
  })

  it('normalizes patient name and clinical notes from extracted records', async () => {
    llmMocks.chat.mockResolvedValue(
      JSON.stringify({
        basicInfo: {
          name: ' 林某 ',
        },
        clinicalNotes: ' 其他信息：患者自述乏力。 ',
        treatmentLines: [],
      }),
    )

    await expect(extractPatientRecord('姓名林某，其他信息为患者自述乏力。')).resolves.toMatchObject({
      basicInfo: {
        name: '林某',
      },
      clinicalNotes: '其他信息：患者自述乏力。',
      treatmentLines: [],
    })
  })

  it('recovers late demographic facts from dense clinical histories when the model omits them', async () => {
    llmMocks.chat.mockResolvedValue(
      JSON.stringify({
        basicInfo: {
          stage: 'PT1N0M0',
          tumorType: '乳腺癌',
        },
        treatmentLines: [
          {
            endDate: '2023年5月',
            lineNumber: 1,
            regimen: '阿贝西利+氟维司群+亮丙瑞林+地舒单抗',
            startDate: '2022年10月',
          },
        ],
      }),
    )

    await expect(
      extractPatientRecord([
        '初发：2021年7月，PT1N0M0；治疗方案：AC方案4次、放疗25+5。',
        '复发：2022年10月骨转；2023年10月肝转单发。',
        '| 1 | 2022年10月-2023年5月 | 阿贝西利+氟维司群+亮丙瑞林+地舒单抗； |',
        '张三，60岁，女。',
        '170厘米',
        '60千克',
      ].join('\n')),
    ).resolves.toMatchObject({
      basicInfo: {
        age: 60,
        gender: '女',
        height: 170,
        name: '张三',
        weight: 60,
      },
    })
  })

  it('recovers compact demographic facts from the exact pasted tail format', async () => {
    llmMocks.chat.mockResolvedValue(
      JSON.stringify({
        basicInfo: {
          stage: 'PT1N0M0',
          tumorType: '乳腺癌',
        },
        treatmentLines: [],
      }),
    )

    await expect(
      extractPatientRecord([
        '初发：2021年7月，PT1N0M0；治疗方案：AC方案4次、放疗25+5；依西美坦+亮丙；',
        '复发：2022年10月骨转；2023年10月肝转单发；2023年12月肝转多发；',
        '张三，60岁，女。170厘米 60千克',
      ].join('\n')),
    ).resolves.toMatchObject({
      basicInfo: {
        age: 60,
        gender: '女',
        height: 170,
        name: '张三',
        weight: 60,
      },
    })
  })

  it('keeps the existing persisted id when merging follow-up extraction', async () => {
    llmMocks.chat.mockResolvedValue(
      JSON.stringify({
        id: 'model-should-not-win',
        basicInfo: {
          stage: 'IV',
        },
        treatmentLines: [],
      }),
    )

    await expect(
      extractPatientRecord('补充：分期 IV。', {
        basicInfo: { tumorType: '乳腺癌' },
        id: 'patient-42',
        treatmentLines: [],
      }),
    ).resolves.toMatchObject({
      basicInfo: {
        stage: 'IV',
        tumorType: '乳腺癌',
      },
      id: 'patient-42',
      treatmentLines: [],
    })
  })

  it('uses a compact JSON field contract instead of a long TypeScript schema prompt', async () => {
    await extractPatientRecord('乳腺癌，2021年7月初发，2022年10月骨转。')

    const messages = llmMocks.chat.mock.calls[0][0]
    const userPrompt = getUserPrompt(messages)

    expect(messages).toHaveLength(1)
    expect(userPrompt).toContain('从病史提取 JSON')
    expect(userPrompt).toContain('只允许这些顶层字段')
    expect(userPrompt).toContain('treatmentLines 是数组')
    expect(userPrompt).not.toContain('labResults 是数组')
    expect(userPrompt).not.toContain('省略该字段')
    expect(userPrompt).not.toContain('当前已知记录')
    expect(userPrompt).not.toContain('目标 JSON 字段合同')
    expect(userPrompt).not.toContain('interface PatientRecord')
    expect(userPrompt).not.toContain('目标 TypeScript schema')
  })

  it('keeps the existing record block only for follow-up extraction', async () => {
    await extractPatientRecord('补充：分期 IV。', {
      basicInfo: {
        tumorType: '乳腺癌',
      },
      treatmentLines: [],
    })

    const messages = llmMocks.chat.mock.calls[0][0]
    const userPrompt = getUserPrompt(messages)

    expect(userPrompt).toContain('当前已知记录：')
    expect(userPrompt).toContain('"tumorType":"乳腺癌"')
  })

  it('adds labResults contract only when the input looks like lab data', async () => {
    await extractPatientRecord('CEA 8.2 ng/mL，参考值 <5。')

    const messages = llmMocks.chat.mock.calls[0][0]
    const userPrompt = getUserPrompt(messages)

    expect(userPrompt).toContain('labResults 是数组')
  })

  it('normalizes Chinese and dotted model dates from dense clinical histories', async () => {
    llmMocks.chat.mockResolvedValue(
      JSON.stringify({
        basicInfo: {
          diagnosisDate: '2021年7月',
          stage: 'PT1N0M0',
        },
        treatmentLines: [
          {
            endDate: '2025年9.25',
            lineNumber: 9,
            regimen: '氟唑帕利+哌柏西利+托瑞米芬',
            startDate: '2025.10.1',
          },
        ],
      }),
    )

    await expect(extractPatientRecord('2025.10.1 氟唑帕利+哌柏西利+托瑞米芬')).resolves.toMatchObject({
      basicInfo: {
        diagnosisDate: '2021-07',
      },
      treatmentLines: [
        {
          endDate: '2025-09-25',
          startDate: '2025-10-01',
        },
      ],
    })
  })
})

describe('getExtractionFailureMessage', () => {
  it('maps auth, rate limit, timeout, upstream, and parse failures to specific Chinese messages', () => {
    expect(getExtractionFailureMessage(new ChatError('AuthError', 'Missing session'), 'zh', 'initial')).toContain('登录状态')
    expect(getExtractionFailureMessage(new ChatError('LLMRateLimitError', 'Too many requests', 429), 'zh', 'initial')).toContain('请求太频繁')
    expect(getExtractionFailureMessage(new ChatError('LLMTimeoutError', 'Timeout', 504), 'zh', 'initial')).toContain('超时')
    expect(getExtractionFailureMessage(new ChatError('LLMUpstreamError', 'Failed', 502), 'zh', 'initial')).toContain('模型服务暂时不可用')
    expect(getExtractionFailureMessage(new ExtractionParseError('{}'), 'zh', 'initial')).toContain('解析失败')
  })
})
