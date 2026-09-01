/**
 * [INPUT]: 依赖 vitest 的 fetch mock，依赖 ./handler.ts 的 createMedicalDocumentOcrHandler。
 * [OUTPUT]: 对外提供 medical-document-ocr Edge Function 协议测试。
 * [POS]: supabase/functions/medical-document-ocr 的 handler 测试，约束 Gemini image/PDF 请求、错误映射、缺 key 与 secret 不泄露。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { describe, expect, it, vi } from 'vitest'

import { createMedicalDocumentOcrHandler, type RuntimeEnv } from './handler.ts'

type FetchCall = {
  body?: unknown
  headers?: Headers
  url: string
}

function createEnv(overrides: Record<string, string | undefined> = {}): RuntimeEnv {
  const values: Record<string, string | undefined> = {
    DEFAULT_GEMINI_MODEL: undefined,
    GEMINI_API_KEY: 'gemini-secret',
    GEMINI_OCR_MODEL: undefined,
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_URL: 'https://project.supabase.co',
    ...overrides,
  }

  return {
    get: (name: string) => values[name],
  }
}

function createRequest(body: unknown) {
  return new Request('https://edge.test/medical-document-ocr', {
    body: JSON.stringify(body),
    headers: {
      Authorization: 'Bearer session-token',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}

function geminiResponse(text: string | null) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text }],
          },
        },
      ],
    }),
    { status: 200 },
  )
}

function createFetchMock(upstreamResponse: Response = geminiResponse('病历 OCR 文本')) {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString()
    const headers = new Headers(init?.headers)
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ body, headers, url })

    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'auth-user' }), { status: 200 })
    }

    return upstreamResponse
  })

  return { calls, fetchMock }
}

async function json(response: Response) {
  return response.json() as Promise<{ error?: { message: string; name: string }; model?: string; text?: string }>
}

describe('medical-document-ocr handler', () => {
  it.each([
    ['image/png', 'record.png'],
    ['application/pdf', 'record.pdf'],
  ])('builds Gemini inline OCR requests for %s', async (mimeType, fileName) => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', fileName, mimeType }))
    const payload = await json(response)
    const geminiCall = calls.find((call) => call.url.includes('generativelanguage.googleapis.com'))!
    const geminiBody = geminiCall.body as { contents: Array<{ parts: Array<Record<string, unknown>> }> }

    expect(response.status).toBe(200)
    expect(payload).toEqual({ model: 'gemini-2.5-flash', text: '病历 OCR 文本' })
    expect(geminiCall.url).not.toContain('gemini-secret')
    expect(geminiCall.headers?.get('x-goog-api-key')).toBe('gemini-secret')
    expect(geminiBody.contents[0].parts[0]).toMatchObject({
      inline_data: {
        data: 'ZmlsZQ==',
        mime_type: mimeType,
      },
    })
    expect(geminiBody.contents[0].parts[1]).toMatchObject({
      text: expect.stringContaining('extract'),
    })
  })

  it('rejects unsupported file types before calling Gemini', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', fileName: 'record.txt', mimeType: 'text/plain' }))
    const payload = await json(response)

    expect(response.status).toBe(400)
    expect(payload.error?.name).toBe('OCRInvalidRequestError')
    expect(calls.some((call) => call.url.includes('generativelanguage.googleapis.com'))).toBe(false)
  })

  it('fails closed when GEMINI_API_KEY is missing without leaking secrets', async () => {
    const { fetchMock } = createFetchMock()
    const handler = createMedicalDocumentOcrHandler({ env: createEnv({ GEMINI_API_KEY: '' }), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', fileName: 'record.pdf', mimeType: 'application/pdf' }))
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).toContain('ConfigurationError')
    expect(body).not.toContain('gemini-secret')
  })

  it.each([
    [new Response('{}', { status: 503 }), 502, 'OCRUpstreamError'],
    [geminiResponse(null), 502, 'OCRInvalidResponseError'],
  ])('maps Gemini failures to stable OCR errors', async (upstreamResponse, status, name) => {
    const { fetchMock } = createFetchMock(upstreamResponse)
    const handler = createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', fileName: 'record.pdf', mimeType: 'application/pdf' }))
    const payload = await json(response)

    expect(response.status).toBe(status)
    expect(payload.error?.name).toBe(name)
  })
})
