/**
 * [INPUT]: 依赖 Fetch API、Supabase JWT 校验端点与 Gemini document/image REST API。
 * [OUTPUT]: 对外提供 createMedicalDocumentOcrHandler、RuntimeEnv 与 medical-document-ocr HTTP 协议。
 * [POS]: supabase/functions/medical-document-ocr 的可测试核心，把鉴权、文件校验、Gemini OCR 请求与错误映射收敛在一处。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createFunctionLogger } from '../_shared/logger.ts'
import { countUsageInWindow, recordUsageEvent } from '../_shared/usage-limits.ts'

const logger = createFunctionLogger('medical-document-ocr')

const DEFAULT_OCR_RATE_LIMIT_PER_WINDOW = 20
const DEFAULT_OCR_RATE_LIMIT_WINDOW_MS = 60_000

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const DEFAULT_DEEPSEEK_OCR_MODEL = 'deepseek-v4-image'
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
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
}

type ErrorCode =
  | 'AuthError'
  | 'ConfigurationError'
  | 'OCRInvalidRequestError'
  | 'OCRRateLimitError'
  | 'OCRInvalidResponseError'
  | 'OCRTimeoutError'
  | 'OCRUpstreamError'

type OcrProvider = 'deepseek' | 'gemini'

type RuntimeConfig = {
  deepseekApiKey: string
  deepseekBaseUrl: string
  deepseekOcrModel: string
  geminiApiKey: string
  geminiModel: string
  ocrProvider: OcrProvider
  ocrRateLimitPerWindow: number
  supabaseAnonKey: string
  supabaseUrl: string
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string | null
      }>
    }
  }>
}

type SupabaseAuthUser = {
  id?: string
}

function parsePositiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readConfig(env: RuntimeEnv): RuntimeConfig {
  const get = (name: string) => env.get(name)?.trim() ?? ''

  return {
    deepseekApiKey: get('DEEPSEEK_API_KEY'),
    deepseekBaseUrl: get('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com',
    deepseekOcrModel: get('DEEPSEEK_OCR_MODEL') || DEFAULT_DEEPSEEK_OCR_MODEL,
    geminiApiKey: get('GEMINI_API_KEY'),
    geminiModel: get('GEMINI_OCR_MODEL') || get('DEFAULT_GEMINI_MODEL') || DEFAULT_GEMINI_MODEL,
    ocrProvider: (get('OCR_PROVIDER') || 'deepseek') === 'gemini' ? 'gemini' as const : 'deepseek' as const,
    ocrRateLimitPerWindow: parsePositiveInteger(get('OCR_RATE_LIMIT_PER_WINDOW'), DEFAULT_OCR_RATE_LIMIT_PER_WINDOW),
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

function isSupportedMimeType(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

function validateBody(body: RequestBody) {
  const mimeType = body.mimeType?.trim() ?? ''
  const dataBase64 = body.dataBase64?.trim() ?? ''

  if (!isSupportedMimeType(mimeType)) {
    return 'Only image and PDF files are supported.'
  }

  if (!dataBase64 || dataBase64.length > MAX_BASE64_LENGTH) {
    return 'OCR file payload is missing or too large.'
  }

  return null
}

function buildGeminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
}

function toGeminiRequest(body: RequestBody) {
  return {
    contents: [
      {
        parts: [
          {
            inline_data: {
              data: body.dataBase64,
              mime_type: body.mimeType,
            },
          },
          {
            text: 'extract all readable medical record text from this document. Return plain text only.',
          },
        ],
        role: 'user',
      },
    ],
  }
}

function extractGeminiText(payload: unknown) {
  const text = (payload as GeminiResponse)?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text ?? '')
    .join('')
    .trim()

  return text ? text : null
}

function isTimeoutError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  return error instanceof Error && error.name === 'AbortError'
}

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}

function toDeepSeekRequest(body: RequestBody, model: string) {
  return {
    messages: [
      {
        content: [
          {
            image_url: {
              url: `data:${body.mimeType};base64,${body.dataBase64}`,
            },
            type: 'image_url',
          },
          {
            text: 'extract all readable medical record text from this document. Return plain text only.',
            type: 'text',
          },
        ],
        role: 'user',
      },
    ],
    model,
  }
}

function extractDeepSeekText(payload: unknown) {
  const text = (payload as DeepSeekResponse)?.choices?.[0]?.message?.content?.trim()

  return text ? text : null
}

async function callDeepSeek(body: RequestBody, config: RuntimeConfig, runtimeFetch: RuntimeFetch, timeoutMs: number) {
  if (!config.deepseekApiKey) {
    return errorResponse(500, 'ConfigurationError', 'DEEPSEEK_API_KEY is not configured.')
  }

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

async function callGemini(body: RequestBody, config: RuntimeConfig, runtimeFetch: RuntimeFetch, timeoutMs: number) {
  if (!config.geminiApiKey) {
    return errorResponse(500, 'ConfigurationError', 'GEMINI_API_KEY is not configured.')
  }

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort('timeout'), timeoutMs)

  try {
    const response = await runtimeFetch(buildGeminiUrl(config.geminiModel), {
      body: JSON.stringify(toGeminiRequest(body)),
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.geminiApiKey,
      },
      method: 'POST',
      signal: abortController.signal,
    })

    if (!response.ok) {
      logger.error('ocr_upstream_rejected', { upstream_status: response.status })
      return errorResponse(response.status === 400 || response.status === 422 ? 400 : 502, response.status === 400 || response.status === 422 ? 'OCRInvalidRequestError' : 'OCRUpstreamError', 'Gemini OCR request failed.')
    }

    const text = extractGeminiText(await response.json())

    if (!text) {
      logger.error('ocr_upstream_invalid_payload', {})
      return errorResponse(502, 'OCRInvalidResponseError', 'Gemini OCR returned an invalid response payload.')
    }

    return jsonResponse(200, {
      model: config.geminiModel,
      text,
    })
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.warn('ocr_upstream_timeout', {})
      return errorResponse(504, 'OCRTimeoutError', 'Gemini OCR request timed out.')
    }

    logger.error('ocr_upstream_error', {})
    return errorResponse(502, 'OCRUpstreamError', 'Gemini OCR request failed.')
  } finally {
    clearTimeout(timeoutId)
  }
}

const ocrRateBuckets = new Map<string, { count: number; windowStartedAt: number }>()

function checkMemoryRateLimit(bucketKey: string, limit: number, windowMs: number, now = Date.now()) {
  const current = ocrRateBuckets.get(bucketKey)

  if (!current || now - current.windowStartedAt >= windowMs) {
    ocrRateBuckets.set(bucketKey, { count: 1, windowStartedAt: now })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count += 1
  return true
}

async function enforceOcrRateLimit(
  config: RuntimeConfig,
  token: string,
  user: SupabaseAuthUser,
  request: Request,
  runtimeFetch: RuntimeFetch,
) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = request.headers.get('cf-connecting-ip')?.trim() || forwardedFor || 'unknown'
  const memoryOk = checkMemoryRateLimit(`${user.id}:${ip}`, config.ocrRateLimitPerWindow, DEFAULT_OCR_RATE_LIMIT_WINDOW_MS)

  if (!memoryOk) {
    return false
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey || !user.id) {
    return true
  }

  const ledgerConfig = {
    supabaseAnonKey: config.supabaseAnonKey,
    supabaseUrl: config.supabaseUrl,
    userToken: token,
  }
  const used = await countUsageInWindow(ledgerConfig, 'ocr_document', user.id, DEFAULT_OCR_RATE_LIMIT_WINDOW_MS, runtimeFetch)

  if (used !== null && used >= config.ocrRateLimitPerWindow) {
    return false
  }

  await recordUsageEvent(ledgerConfig, 'ocr_document', runtimeFetch)

  return true
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

      if (!(await enforceOcrRateLimit(config, token, user, request, runtimeFetch))) {
        logger.warn('rate_limit_exceeded', {})
        return errorResponse(429, 'OCRRateLimitError', 'OCR request rate limit exceeded.')
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

    if (config.ocrProvider === 'gemini') {
      return callGemini(body, config, runtimeFetch, timeoutMs)
    }

    if (body.mimeType === 'application/pdf') {
      logger.warn('ocr_provider_unsupported_input', { provider: 'deepseek' })
      return errorResponse(400, 'OCRInvalidRequestError', 'The DeepSeek image model does not accept PDF input. Convert the page to an image, or set OCR_PROVIDER=gemini.')
    }

    return callDeepSeek(body, config, runtimeFetch, timeoutMs)
  }
}
