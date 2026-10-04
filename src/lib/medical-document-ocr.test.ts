/**
 * [INPUT]: 依赖 vitest 的 Supabase session 与 fetch mock，依赖 ./medical-document-ocr 的 OCR 请求封装。
 * [OUTPUT]: 对外提供医学文档 OCR 前端协议回归测试。
 * [POS]: src/lib 的 OCR client 测试，约束图片/PDF 上传、错误映射、空文本处理与浏览器不泄露 provider key。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
    },
  }),
  hasSupabaseEnv: true,
  hasSupabaseFunctionEnv: true,
  supabaseEdgeFunctionUrl: 'https://edge.example.test/functions/v1',
}))

import { MedicalDocumentOcrError, recognizeMedicalDocument } from './medical-document-ocr'

function file(name: string, type: string, content = 'demo') {
  return new File([content], name, { type })
}

describe('recognizeMedicalDocument', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'session-token',
        },
      },
      error: null,
    })
  })

  it.each([
    ['record.png', 'image/png'],
    ['record.pdf', 'application/pdf'],
  ])('posts supported %s files to the OCR boundary', async (name, type) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: '识别出的病历文字' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await recognizeMedicalDocument(file(name, type))
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)

    expect(result.text).toBe('识别出的病历文字')
    expect(fetchMock.mock.calls[0][0]).toBe('https://edge.example.test/functions/v1/medical-document-ocr')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer session-token')
    expect(JSON.stringify(fetchMock.mock.calls[0])).not.toContain('gemini-key')
    expect(requestBody).toMatchObject({
      fileName: name,
      mimeType: type,
    })
    expect(typeof requestBody.dataBase64).toBe('string')
  })

  it('rejects unsupported file types before calling OCR', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(recognizeMedicalDocument(file('notes.txt', 'text/plain'))).rejects.toMatchObject({
      name: 'OCRInvalidFileError',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps OCR error envelopes to typed errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'OCR failed.', name: 'OCRUpstreamError' } }), {
          status: 502,
        }),
      ),
    )

    try {
      await recognizeMedicalDocument(file('record.png', 'image/png'))
      throw new Error('Expected OCR request to fail.')
    } catch (error) {
      expect(error).toBeInstanceOf(MedicalDocumentOcrError)
      expect(error).toMatchObject({
        name: 'OCRUpstreamError',
        status: 502,
      })
    }
  })

  it('rejects empty OCR text as recoverable invalid response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: '   ' }), { status: 200 })),
    )

    await expect(recognizeMedicalDocument(file('record.pdf', 'application/pdf'))).rejects.toMatchObject({
      name: 'OCRInvalidResponseError',
    })
  })
})
