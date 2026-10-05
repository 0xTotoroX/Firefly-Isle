/**
 * [INPUT]: 依赖 vitest 的 fetch mock，依赖 ./handler.ts 的 createMedicalDocumentOcrHandler。
 * [OUTPUT]: 对外提供 medical-document-ocr Edge Function 协议测试。
 * [POS]: supabase/functions/medical-document-ocr 的 handler 测试，约束 DeepSeek 多页请求、错误映射、缺 key 与 secret 不泄露。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
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
    DEEPSEEK_API_KEY: 'deepseek-ocr-secret',
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

function deepSeekResponse(text: string | null) {
  return Response.json({ choices: [{ message: { content: text } }] })
}

function createFetchMock(upstreamResponse: Response = deepSeekResponse('病历 OCR 文本')) {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString()
    const headers = new Headers(init?.headers)
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ body, headers, url })

    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'auth-user' }), { status: 200 })
    }

    if (url.includes('/rest/v1/rpc/consume_usage')) {
      return Response.json({ allowed: true, reason: null })
    }

    return upstreamResponse
  })

  return { calls, fetchMock }
}

async function json(response: Response) {
  return response.json() as Promise<{ error?: { message: string; name: string }; model?: string; text?: string }>
}

describe('medical-document-ocr handler', () => {
  it('sends ordered PDF page images in one request and consumes one quota', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })
    const pages = [
      { dataBase64: 'ZmlsZQ==', mimeType: 'image/png' },
      { dataBase64: 'cGFnZTI=', mimeType: 'image/jpeg' },
    ]
    const response = await handler(createRequest({ fileName: 'report.pdf', mimeType: 'application/pdf', pages }))
    expect(response.status).toBe(200)
    expect(await json(response)).toEqual({ model: 'deepseek-flash', text: '病历 OCR 文本' })
    expect(calls.filter(call => call.url.includes('/rpc/consume_usage'))).toHaveLength(1)
    const upstream = calls.filter(call => call.url.includes('/chat/completions'))
    expect(upstream).toHaveLength(1)
    expect(upstream[0].headers?.get('Authorization')).toBe('Bearer deepseek-ocr-secret')
    const body = upstream[0].body as { messages: Array<{ content: Array<{ type: string; image_url?: { url: string } }> }> }
    expect(body.messages[0].content.filter(part => part.type === 'image_url').map(part => part.image_url?.url))
      .toEqual(['data:image/png;base64,ZmlsZQ==', 'data:image/jpeg;base64,cGFnZTI='])
  })

  it.each([null, [], { mimeType: 123 }, { mimeType: 'application/pdf', pages: [] },
    { mimeType: 'application/pdf', pages: [{ mimeType: 'image/svg+xml', dataBase64: 'ZmlsZQ==' }] },
    { mimeType: 'application/pdf', pages: [{ mimeType: 'image/png', dataBase64: 'A'.repeat(12 * 1024 * 1024) }] },
  ])('rejects malformed payload before consuming quota', async (body) => {
    const { calls, fetchMock } = createFetchMock()
    const response = await createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })(createRequest(body))
    expect(response.status).toBe(400)
    expect(calls).toHaveLength(1)
  })

  it.each([
    [{ allowed: false, reason: 'quota' }, 429],
    [{ allowed: false, reason: 'window' }, 429],
    [{ invalid: true }, 503],
  ])('stops OCR when quota RPC returns %j', async (decision, status) => {
    const { calls, fetchMock } = createFetchMock()
    const baseFetch = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) => input.toString().includes('/rpc/consume_usage')
      ? Response.json(decision)
      : baseFetch(input, init))
    const handler = createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', mimeType: 'image/png' }))
    expect(response.status).toBe(status)
    expect(calls.some((call) => call.url.includes('/chat/completions'))).toBe(false)
  })

  it('does not call OCR when the quota database fails', async () => {
    const { calls, fetchMock } = createFetchMock()
    const baseFetch = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) => {
      if (input.toString().includes('/rpc/consume_usage')) throw new Error('offline')
      return baseFetch(input, init)
    })
    const handler = createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', mimeType: 'image/png' }))
    expect(response.status).toBe(503)
    expect(calls.some((call) => call.url.includes('/chat/completions'))).toBe(false)
  })

  it('rejects unsupported file types before calling DeepSeek', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', fileName: 'record.txt', mimeType: 'text/plain' }))
    const payload = await json(response)

    expect(response.status).toBe(400)
    expect(payload.error?.name).toBe('OCRInvalidRequestError')
    expect(calls.some((call) => call.url.includes('/rpc/consume_usage'))).toBe(false)
    expect(calls.some((call) => call.url.includes('/chat/completions'))).toBe(false)
  })

  it('fails closed when DEEPSEEK_API_KEY is missing without leaking secrets', async () => {
    const { fetchMock } = createFetchMock()
    const handler = createMedicalDocumentOcrHandler({ env: createEnv({ DEEPSEEK_API_KEY: '' }), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', fileName: 'record.png', mimeType: 'image/png' }))
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).toContain('ConfigurationError')
    expect(body).not.toContain('deepseek-ocr-secret')
  })

  it.each([
    [new Response('{}', { status: 503 }), 502, 'OCRUpstreamError'],
    [deepSeekResponse(null), 502, 'OCRInvalidResponseError'],
    [Response.json({ choices: [{ finish_reason: 'length', message: { content: 'truncated report' } }] }), 502, 'OCRInvalidResponseError'],
  ])('maps DeepSeek failures to stable OCR errors', async (upstreamResponse, status, name) => {
    const { fetchMock } = createFetchMock(upstreamResponse)
    const handler = createMedicalDocumentOcrHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', fileName: 'record.png', mimeType: 'image/png' }))
    const payload = await json(response)

    expect(response.status).toBe(status)
    expect(payload.error?.name).toBe(name)
  })
})

describe('medical-document-ocr image input', () => {
  it('uses DeepSeek only even if legacy Gemini provider env is present', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createMedicalDocumentOcrHandler({ env: createEnv({ OCR_PROVIDER: 'gemini', GEMINI_API_KEY: 'unused' }), fetch: fetchMock })
    const response = await handler(createRequest({ dataBase64: 'ZmlsZQ==', mimeType: 'image/png' }))
    expect(response.status).toBe(200)
    expect(calls.at(-1)?.url).toBe('https://api.deepseek.com/chat/completions')
    expect(JSON.stringify(calls)).not.toContain('unused')
  })
})
