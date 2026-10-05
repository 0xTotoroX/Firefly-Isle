/**
 * [INPUT]: 依赖 Fetch API、Supabase JWT、原子配额、DeepSeek 多图 API。
 * [OUTPUT]: 对外提供 createMedicalDocumentOcrHandler、RuntimeEnv 与 medical-document-ocr HTTP 协议。
 * [POS]: supabase/functions/medical-document-ocr 的可测试核心，把鉴权、文件校验、DeepSeek OCR 请求与错误映射收敛在一处。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { createFunctionLogger } from '../_shared/logger.ts'
import { consumeUsage } from '../_shared/usage-limits.ts'

const logger = createFunctionLogger('medical-document-ocr')


const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const DEFAULT_DEEPSEEK_OCR_MODEL = 'deepseek-flash'
const DEFAULT_REQUEST_TIMEOUT_MS = 45_000
const MAX_BASE64_LENGTH = Math.ceil((8 * 1024 * 1024 * 4) / 3)

export type RuntimeEnv = {
  get(name: string): string | undefined
}

type RuntimeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type HandlerOptions = {
  env: RuntimeEnv
  fetch?: RuntimeFetch
  timeoutMs?: number
}

type RequestBody = {
  dataBase64?: string
  fileName?: string
  mimeType?: string
  pages?: Array<{ dataBase64: string; mimeType: string }>
}

type ErrorCode =
  | 'AuthError'
  | 'ConfigurationError'
  | 'OCRInvalidRequestError'
  | 'OCRRateLimitError'
  | 'OCRInvalidResponseError'
  | 'OCRTimeoutError'
  | 'OCRUpstreamError'

type RuntimeConfig = {
  deepseekApiKey: string
  deepseekBaseUrl: string
  deepseekOcrModel: string
  supabaseAnonKey: string
  supabaseUrl: string
}

type SupabaseAuthUser = {
  id?: string
}

function readConfig(env: RuntimeEnv): RuntimeConfig {
  const get = (name: string) => env.get(name)?.trim() ?? ''

  return {
    deepseekApiKey: get('DEEPSEEK_API_KEY'),
    deepseekBaseUrl: get('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com',
    deepseekOcrModel: get('DEEPSEEK_OCR_MODEL') || DEFAULT_DEEPSEEK_OCR_MODEL,
    supabaseAnonKey: get('SUPABASE_ANON_KEY'),
    supabaseUrl: get('SUPABASE_URL'),
  }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  })
}

function errorResponse(status: number, name: ErrorCode, message: string) {
  return jsonResponse(status, {
    error: {
      message,
      name,
    },
  })
}

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice('Bearer '.length).trim() || null
}

async function verifyJwt(token: string, config: RuntimeConfig, runtimeFetch: RuntimeFetch) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Missing Supabase runtime configuration')
  }

  const response = await runtimeFetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

function isSupabaseAuthUser(value: unknown): value is SupabaseAuthUser {
  const id = (value as SupabaseAuthUser | null | undefined)?.id
  return typeof id === 'string' && id.trim().length > 0
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

function validateBody(body: RequestBody) {
  if (!body || typeof body !== 'object') return 'OCR request must be an object.'
  const pages = body.mimeType === 'application/pdf' ? body.pages : [body]
  if (!Array.isArray(pages) || !pages.length || pages.length > 600) {
    return 'PDF pages must be rendered as images before OCR.'
  }
  let totalLength = 0
  for (const page of pages) {
    if (!page || typeof page.mimeType !== 'string' || !IMAGE_MIME_TYPES.has(page.mimeType) || typeof page.dataBase64 !== 'string'
      || !page.dataBase64.length || !/^[A-Za-z0-9+/]+={0,2}$/.test(page.dataBase64)) {
      return 'OCR requires JPEG, PNG, GIF or WebP image data.'
    }
    totalLength += page.dataBase64.length
    if (totalLength > MAX_BASE64_LENGTH) return 'OCR image payload is too large.'
  }
  return null
}

function isTimeoutError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  return error instanceof Error && error.name === 'AbortError'
}

type DeepSeekResponse = {
  choices?: Array<{
    finish_reason?: string
    message?: {
      content?: string | null
    }
  }>
}

function toDeepSeekRequest(body: RequestBody, model: string) {
  const pages = body.mimeType === 'application/pdf' ? body.pages! : [body]
  return {
    messages: [{
      content: [
        ...pages.flatMap((page, index) => [
          { type: 'text', text: `Document page ${index + 1}` },
          { type: 'image_url', image_url: { url: `data:${page.mimeType};base64,${page.dataBase64}` } },
        ]),
        { type: 'text', text: 'Extract all readable medical record text from every page in order. Return plain text only. Preserve dates, numbers and units. Do not infer missing content or provide medical advice.' },
      ],
      role: 'user',
    }],
    model,
    thinking: { type: 'disabled' },
  }
}

function extractDeepSeekText(payload: unknown) {
  const choice = (payload as DeepSeekResponse)?.choices?.[0]
  if (choice?.finish_reason === 'length') return null
  const text = choice?.message?.content?.trim()

  return text ? text : null
}

async function callDeepSeek(body: RequestBody, config: RuntimeConfig, runtimeFetch: RuntimeFetch, timeoutMs: number) {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort('timeout'), timeoutMs)

  try {
    const response = await runtimeFetch(`${config.deepseekBaseUrl.replace(/\/$/, '')}/chat/completions`, {
      body: JSON.stringify(toDeepSeekRequest(body, config.deepseekOcrModel)),
      headers: {
        Authorization: `Bearer ${config.deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: abortController.signal,
    })

    if (!response.ok) {
      logger.error('ocr_upstream_rejected', { provider: 'deepseek', upstream_status: response.status })
      return errorResponse(response.status === 400 || response.status === 422 ? 400 : 502, response.status === 400 || response.status === 422 ? 'OCRInvalidRequestError' : 'OCRUpstreamError', 'DeepSeek OCR request failed.')
    }

    const text = extractDeepSeekText(await response.json())

    if (!text) {
      logger.error('ocr_upstream_invalid_payload', { provider: 'deepseek' })
      return errorResponse(502, 'OCRInvalidResponseError', 'DeepSeek OCR returned an invalid response payload.')
    }

    return jsonResponse(200, {
      model: config.deepseekOcrModel,
      text,
    })
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.warn('ocr_upstream_timeout', { provider: 'deepseek' })
      return errorResponse(504, 'OCRTimeoutError', 'DeepSeek OCR request timed out.')
    }

    logger.error('ocr_upstream_error', { provider: 'deepseek' })
    return errorResponse(502, 'OCRUpstreamError', 'DeepSeek OCR request failed.')
  } finally {
    clearTimeout(timeoutId)
  }
}

export function createMedicalDocumentOcrHandler(options: HandlerOptions) {
  const runtimeFetch = options.fetch ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS

  return async function handleMedicalDocumentOcrRequest(request: Request) {
    const config = readConfig(options.env)

    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return errorResponse(405, 'OCRInvalidRequestError', 'Only POST is supported.')
    }

    const token = extractBearerToken(request)

    if (!token) {
      return errorResponse(401, 'AuthError', 'Missing Supabase bearer token.')
    }

    try {
      const user = await verifyJwt(token, config, runtimeFetch)

      if (!isSupabaseAuthUser(user)) {
        return errorResponse(401, 'AuthError', 'Invalid Supabase session.')
      }

    } catch {
      return errorResponse(500, 'ConfigurationError', 'Supabase auth verification failed.')
    }

    let body: RequestBody

    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'OCRInvalidRequestError', 'Request body must be valid JSON.')
    }

    const validationError = validateBody(body)

    if (validationError) {
      return errorResponse(400, 'OCRInvalidRequestError', validationError)
    }

    if (!config.deepseekApiKey) {
      return errorResponse(500, 'ConfigurationError', 'DEEPSEEK_API_KEY is not configured.')
    }

    const usage = await consumeUsage({ ...config, userToken: token }, 'ocr_document', runtimeFetch)
    if (usage === 'unavailable') {
      logger.error('usage_service_unavailable', {})
      return errorResponse(503, 'OCRUpstreamError', 'Usage service is temporarily unavailable.')
    }
    if (usage !== 'allowed') {
      logger.warn('rate_limit_exceeded', { layer: usage })
      return errorResponse(429, 'OCRRateLimitError', 'OCR request rate limit exceeded.')
    }

    return callDeepSeek(body, config, runtimeFetch, timeoutMs)
  }
}
