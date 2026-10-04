/**
 * [INPUT]: 依赖 vitest 的 fetch mock，依赖 ./handler.ts 的 createLlmProxyHandler。
 * [OUTPUT]: 对外提供 llm-proxy provider 选择、用户 provider/model 设置、系统 DeepSeek 测试、Gemini 密钥转发与错误映射测试。
 * [POS]: supabase/functions/llm-proxy 的协议测试，替代本机缺失 Deno 时的最近本地验证层。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it, vi } from 'vitest'

import { createLlmProxyHandler, type RuntimeEnv } from './handler.ts'

const messages = [
  {
    role: 'user' as const,
    content: 'Hello',
  },
]

type FetchCall = {
  body?: unknown
  headers?: Headers
  method?: string
  url: string
}

function createEnv(overrides: Record<string, string | undefined> = {}): RuntimeEnv {
  const values: Record<string, string | undefined> = {
    DEEPSEEK_API_KEY: 'deepseek-key',
    DEFAULT_DEEPSEEK_MODEL: undefined,
    DEFAULT_GEMINI_MODEL: undefined,
    DEFAULT_LLM_PROVIDER: undefined,
    GEMINI_API_KEY: 'gemini-key',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_URL: 'https://project.supabase.co',
    ...overrides,
  }

  return {
    get: (name: string) => values[name],
  }
}

function createRequest(body: unknown) {
  return new Request('https://edge.test/llm-proxy', {
    body: JSON.stringify(body),
    headers: {
      Authorization: 'Bearer session-token',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}

function createFetchMock(
  upstreamResponse: Response | Error = deepSeekResponse('deepseek-v4-flash', 'ok'),
  authUser: Record<string, unknown> = { id: 'auth-user' },
  ledgerBehavior: 'default' | 'exhausted' | 'error' = 'default',
) {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString()
    const headers = new Headers(init?.headers)
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ body, headers, method: init?.method, url })

    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify(authUser), { status: 200 })
    }

    if (url.includes('/rest/v1/llm_provider_settings')) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (url.includes('/rest/v1/rpc/consume_usage')) {
      if (ledgerBehavior === 'error') throw new Error('ledger unavailable')
      return Response.json({ allowed: ledgerBehavior !== 'exhausted', reason: ledgerBehavior === 'exhausted' ? 'quota' : null })
    }

    if (upstreamResponse instanceof Error) {
      throw upstreamResponse
    }

    return upstreamResponse
  })

  return { calls, fetchMock }
}

function createSettingsFetchMock(
  upstreamResponse: Response | Error = deepSeekResponse('deepseek-v4-flash', 'ok'),
  authUser: Record<string, unknown> = { id: 'auth-user' },
) {
  const calls: FetchCall[] = []
  let savedRows: unknown[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString()
    const headers = new Headers(init?.headers)
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ body, headers, method: init?.method, url })

    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify(authUser), { status: 200 })
    }

    if (url.includes('/rest/v1/llm_provider_settings')) {
      if (init?.method === 'DELETE') {
        savedRows = []
        return new Response(null, { status: 204 })
      }

      if (init?.method === 'POST') {
        savedRows = body ? [body] : []
        return new Response(JSON.stringify(savedRows[0]), {
          headers: { 'Content-Type': 'application/json' },
          status: 201,
        })
      }

      return new Response(JSON.stringify(savedRows), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (url.includes('/rest/v1/rpc/consume_usage')) {
      return Response.json({ allowed: true, reason: null })
    }

    if (upstreamResponse instanceof Error) {
      throw upstreamResponse
    }

    return upstreamResponse
  })

  return { calls, fetchMock, getSavedRows: () => savedRows }
}

function deepSeekResponse(model: string, content: string | null) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
      model,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown> & { error?: { message?: string; name: string }; model?: string; text?: string }>
}

function findUpstreamCall(calls: FetchCall[]) {
  return calls.find((call) => !call.url.includes('supabase.co'))
}

describe('llm-proxy provider handler', () => {
  it('uses system DeepSeek when no provider, no default provider, and no user setting are configured', async () => {
    const { calls, fetchMock } = createSettingsFetchMock(deepSeekResponse('deepseek-v4-flash', 'deepseek text'))
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ messages }))
    const payload = await json(response)

    expect(payload).toEqual({ model: 'deepseek-v4-flash', text: 'deepseek text' })
    expect(findUpstreamCall(calls)?.url).toBe('https://api.deepseek.com/chat/completions')
  })

  it('uses explicit DeepSeek provider and default non-deprecated model', async () => {
    const { calls, fetchMock } = createFetchMock(deepSeekResponse('deepseek-v4-flash', 'deepseek text'))
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ messages, provider: 'deepseek' }))
    const payload = await json(response)

    expect(payload).toEqual({ model: 'deepseek-v4-flash', text: 'deepseek text' })
    const upstreamCall = findUpstreamCall(calls)

    expect(upstreamCall?.url).toBe('https://api.deepseek.com/chat/completions')
    expect(upstreamCall?.headers?.get('Authorization')).toBe('Bearer deepseek-key')
    expect(upstreamCall?.body).toMatchObject({
      messages,
      model: 'deepseek-v4-flash',
      stream: false,
    })
  })

  it('lets an explicit Gemini provider override a DeepSeek default provider', async () => {
    const { calls, fetchMock } = createFetchMock(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'gemini text' }] } }] }), {
        status: 200,
      }),
    )
    const handler = createLlmProxyHandler({
      env: createEnv({ DEFAULT_LLM_PROVIDER: 'deepseek' }),
      fetch: fetchMock,
    })
    const response = await handler(createRequest({ messages, provider: 'gemini' }))
    const payload = await json(response)
    const upstreamCall = findUpstreamCall(calls)

    expect(payload.text).toBe('gemini text')
    expect(upstreamCall?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent')
    expect(upstreamCall?.url).not.toContain('gemini-key')
    expect(upstreamCall?.headers?.get('x-goog-api-key')).toBe('gemini-key')
  })

  it('rejects unknown providers before calling an upstream model', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ messages, provider: 'open-router' }))
    const payload = await json(response)

    expect(response.status).toBe(400)
    expect(payload.error?.name).toBe('LLMInvalidRequestError')
    expect(calls.filter((call) => !call.url.includes('/auth/v1/user') && !call.url.includes('/rest/v1/llm_provider_settings'))).toHaveLength(0)
    expect(calls[0].url).toContain('/auth/v1/user')
  })

  it('forwards JSON object response format to DeepSeek', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    await handler(
      createRequest({
        messages,
        provider: 'deepseek',
        responseFormat: 'json_object',
      }),
    )

    expect(findUpstreamCall(calls)?.body).toMatchObject({
      response_format: {
        type: 'json_object',
      },
    })
  })

  it.each([
    [createEnv({ DEEPSEEK_API_KEY: '' }), deepSeekResponse('deepseek-v4-flash', 'ok'), 500, 'ConfigurationError'],
    [createEnv(), new Response('{}', { status: 400 }), 400, 'LLMInvalidRequestError'],
    [createEnv(), new Response('{}', { status: 422 }), 400, 'LLMInvalidRequestError'],
    [createEnv(), new Response('{}', { status: 429 }), 429, 'LLMRateLimitError'],
    [createEnv(), deepSeekResponse('deepseek-v4-flash', null), 502, 'LLMInvalidResponseError'],
    [createEnv(), new Response('{}', { status: 503 }), 502, 'LLMUpstreamError'],
  ])('maps DeepSeek failure to a stable error envelope', async (env, upstreamResponse, status, name) => {
    const { fetchMock } = createFetchMock(upstreamResponse)
    const handler = createLlmProxyHandler({ env, fetch: fetchMock })
    const response = await handler(createRequest({ messages, provider: 'deepseek' }))
    const payload = await json(response)

    expect(response.status).toBe(status)
    expect(payload.error?.name).toBe(name)
  })

  it('maps DeepSeek aborts to timeout errors', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const { fetchMock } = createFetchMock(abortError)
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ messages, provider: 'deepseek' }))
    const payload = await json(response)

    expect(response.status).toBe(504)
    expect(payload.error?.name).toBe('LLMTimeoutError')
  })

  it('honors the database short-window rejection before calling the upstream model', async () => {
    const { calls, fetchMock } = createFetchMock()
    const baseFetch = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) => input.toString().includes('/rpc/consume_usage')
      ? Response.json({ allowed: false, reason: 'window' })
      : baseFetch(input, init))
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ messages, provider: 'deepseek' }))

    expect(response.status).toBe(429)
    expect(calls.some((call) => call.url.includes('/chat/completions'))).toBe(false)
  })

  it('rejects models outside the provider allowlist before calling the upstream model', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createLlmProxyHandler({
      env: createEnv({ LLM_MODEL_ALLOWLIST_DEEPSEEK: 'deepseek-official-' }),
      fetch: fetchMock,
    })

    const response = await handler(createRequest({ messages, model: 'deepseek-v4-flash', provider: 'deepseek' }))
    const payload = await json(response)

    expect(response.status).toBe(400)
    expect(payload.error?.name).toBe('LLMInvalidRequestError')
    expect(calls.some((call) => call.url.includes('/chat/completions'))).toBe(false)
  })

  it('enforces the durable usage ledger limit before calling the upstream model', async () => {
    const { calls, fetchMock } = createFetchMock(deepSeekResponse('deepseek-v4-flash', 'unused'), { id: 'auth-user' }, 'exhausted')

    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ messages, provider: 'deepseek' }))
    const payload = await json(response)

    expect(response.status).toBe(429)
    expect(payload.error?.name).toBe('LLMRateLimitError')
    expect(calls.some((call) => call.url.includes('/chat/completions'))).toBe(false)
  })

  it('fails closed without calling the model when the quota service is unavailable', async () => {
    const { calls, fetchMock } = createFetchMock(deepSeekResponse('deepseek-v4-flash', 'unused'), { id: 'auth-user' }, 'error')
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ messages, provider: 'deepseek' }))

    expect(response.status).toBe(503)
    expect(calls.some((call) => call.url.includes('/chat/completions'))).toBe(false)
  })

  it('records one attempt before upstream failure and never refunds or records twice', async () => {
    const { calls, fetchMock } = createFetchMock(new Response('{}', { status: 503 }))
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(createRequest({ messages, provider: 'deepseek' }))

    expect(response.status).toBe(502)
    const usageCalls = calls.filter((call) => call.url.includes('/rpc/consume_usage'))
    expect(usageCalls).toHaveLength(1)
    expect(usageCalls[0].body).toEqual({ event_kind: 'llm_chat' })
    expect(calls.indexOf(usageCalls[0])).toBeLessThan(calls.findIndex((call) => call.url.includes('/chat/completions')))
  })

  it('does not consume model quota for settings or invalid model requests', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createLlmProxyHandler({ env: createEnv(), fetch: fetchMock })
    const settings = await handler(createRequestWithMethod('/settings', 'GET'))
    const invalid = await handler(createRequest({ messages, model: 'not-permitted', provider: 'deepseek' }))

    expect(settings.status).toBe(200)
    expect(invalid.status).toBe(400)
    expect(calls.some((call) => call.url.includes('/rpc/consume_usage'))).toBe(false)
  })

  it('saves a preset user key and model encrypted, reads them for routing, and never returns plaintext', async () => {
    const { calls, fetchMock, getSavedRows } = createSettingsFetchMock(
      new Response(JSON.stringify({ choices: [{ message: { content: 'openai text' } }] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    const handler = createLlmProxyHandler({
      env: createEnv({ LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY: 'test encryption secret' }),
      fetch: fetchMock,
    })

    const saveResponse = await handler(createRequestWithMethod('/settings', 'PUT', {
      apiKey: 'openai-user-key',
      model: 'gpt-4.1-mini',
      provider: 'openai',
    }))
    const savePayload = await json(saveResponse)
    await handler(createRequest({ messages }))

    const savedText = JSON.stringify(getSavedRows())
    const upstreamCall = findUpstreamCall(calls)

    expect(savePayload).toMatchObject({ keySet: true, mode: 'user', model: 'gpt-4.1-mini', provider: 'openai' })
    expect(savePayload).not.toHaveProperty('apiKey')
    expect(savedText).not.toContain('openai-user-key')
    expect(savedText).toContain('api_key_ciphertext')
    expect(upstreamCall?.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(upstreamCall?.headers?.get('Authorization')).toBe('Bearer openai-user-key')
    expect(upstreamCall?.body).toMatchObject({ model: 'gpt-4.1-mini' })
  })

  it('bypasses saved user settings for the system DeepSeek connection test', async () => {
    const { calls, fetchMock } = createSettingsFetchMock(deepSeekResponse('deepseek-v4-flash', 'deepseek text'))
    const handler = createLlmProxyHandler({
      env: createEnv({ LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY: 'test encryption secret' }),
      fetch: fetchMock,
    })

    await handler(createRequestWithMethod('/settings', 'PUT', {
      apiKey: 'openai-user-key',
      model: 'gpt-4.1-mini',
      provider: 'openai',
    }))
    const response = await handler(createRequest({
      bypassSavedSetting: true,
      messages: [{ content: '请只回复 OK，用于测试模型服务连通性。', role: 'user' }],
      model: 'deepseek-v4-flash',
      provider: 'deepseek',
    }))
    const payload = await json(response)
    const upstreamCall = findUpstreamCall(calls)

    expect(payload).toEqual({ model: 'deepseek-v4-flash', text: 'deepseek text' })
    expect(upstreamCall?.url).toBe('https://api.deepseek.com/chat/completions')
    expect(upstreamCall?.headers?.get('Authorization')).toBe('Bearer deepseek-key')
    expect(upstreamCall?.body).toMatchObject({ model: 'deepseek-v4-flash' })
  })

  it('rejects saved-setting bypass outside the fixed system DeepSeek test', async () => {
    const { calls, fetchMock } = createSettingsFetchMock()
    const handler = createLlmProxyHandler({
      env: createEnv({ LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY: 'test encryption secret' }),
      fetch: fetchMock,
    })

    const response = await handler(createRequest({
      bypassSavedSetting: true,
      messages,
      provider: 'openai',
    }))
    const payload = await json(response)

    expect(response.status).toBe(400)
    expect(payload.error?.name).toBe('LLMInvalidRequestError')
    expect(calls.filter((call) => !call.url.includes('/auth/v1/user') && !call.url.includes('/rest/v1/llm_provider_settings'))).toHaveLength(0)
  })

  it('routes custom OpenAI-style settings through the stored HTTPS base URL and model', async () => {
    const { calls, fetchMock } = createSettingsFetchMock(
      new Response(JSON.stringify({ choices: [{ message: { content: 'custom text' } }] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    const handler = createLlmProxyHandler({
      env: createEnv({ LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY: 'test encryption secret' }),
      fetch: fetchMock,
    })

    await handler(createRequestWithMethod('/settings', 'PUT', {
      apiKey: 'custom-user-key',
      baseUrl: 'https://llm.example.test/v1',
      model: 'custom-model',
      provider: 'custom_openai',
    }))
    const response = await handler(createRequest({ messages }))
    const payload = await json(response)
    const upstreamCall = findUpstreamCall(calls)

    expect(payload).toEqual({ model: 'custom-model', text: 'custom text' })
    expect(upstreamCall?.url).toBe('https://llm.example.test/v1/chat/completions')
    expect(upstreamCall?.body).toMatchObject({ messages, model: 'custom-model', stream: false })
    expect(upstreamCall?.headers?.get('Authorization')).toBe('Bearer custom-user-key')
  })

  it('rejects invalid custom base URLs before persisting settings', async () => {
    const { calls, fetchMock } = createSettingsFetchMock()
    const handler = createLlmProxyHandler({
      env: createEnv({ LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY: 'test encryption secret' }),
      fetch: fetchMock,
    })

    const response = await handler(createRequestWithMethod('/settings', 'PUT', {
      apiKey: 'custom-user-key',
      baseUrl: 'http://localhost:11434/v1',
      model: 'custom-model',
      provider: 'custom_openai',
    }))
    const payload = await json(response)

    expect(response.status).toBe(400)
    expect(payload.error?.name).toBe('LLMInvalidRequestError')
    expect(calls.filter((call) => call.url.includes('/rest/v1/llm_provider_settings') && call.method === 'POST')).toHaveLength(0)
  })

  it('maps user-owned provider authentication failures without leaking the saved key', async () => {
    const { fetchMock } = createSettingsFetchMock(new Response('{}', { status: 401 }))
    const handler = createLlmProxyHandler({
      env: createEnv({ LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY: 'test encryption secret' }),
      fetch: fetchMock,
    })

    await handler(createRequestWithMethod('/settings', 'PUT', {
      apiKey: 'bad-openai-key',
      model: 'gpt-4.1-mini',
      provider: 'openai',
    }))
    const response = await handler(createRequest({ messages }))
    const payload = await json(response)
    const responseText = JSON.stringify(payload)

    expect(response.status).toBe(500)
    expect(payload.error?.name).toBe('ConfigurationError')
    expect(responseText).not.toContain('bad-openai-key')
  })
})

function createRequestWithMethod(pathname: string, method: string, body?: unknown) {
  return new Request(`https://edge.test/llm-proxy${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Authorization: 'Bearer session-token',
      'Content-Type': 'application/json',
    },
    method,
  })
}
