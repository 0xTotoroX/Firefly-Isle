/**
 * [INPUT]: 依赖 Fetch API、Supabase JWT 校验端点、PostgREST、Web Crypto 与 provider-adapters。
 * [OUTPUT]: 对外提供 createLlmProxyHandler、RuntimeEnv 与 llm-proxy 统一 HTTP 协议，支持用户 provider 设置与显式系统 provider 测试。
 * [POS]: supabase/functions/llm-proxy 的可测试核心，把鉴权、设置加密持久化、provider/model 选择与错误协议收敛在一处。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_DEEPSEEK_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GLM_MODEL,
  DEFAULT_KIMI_MODEL,
  DEFAULT_OPENAI_MODEL,
  buildProviderRequest,
  extractProviderText,
  isChatProvider,
  isPresetProvider,
  mapProviderError,
  type ChatProvider,
  type ErrorCode,
  type ErrorResponse,
  type Message,
  type ProviderBuildOptions,
  type ProviderRequest,
  type ResponseFormat,
} from './provider-adapters.ts'
import { createFunctionLogger } from '../_shared/logger.ts'
import {
  checkUserRateLimit,
  enforceDurableRateLimit,
  isModelAllowed,
  parseModelAllowlist,
  resolvePlanQuota,
} from './rate-limits.ts'

const logger = createFunctionLogger('llm-proxy')

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const DEFAULT_LLM_PROVIDER: ChatProvider = 'deepseek'
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000
const DEFAULT_AUTHENTICATED_RATE_LIMIT_PER_WINDOW = 60
const DEFAULT_ANONYMOUS_RATE_LIMIT_PER_WINDOW = 10
const CLAUDE_BASE_URL = 'https://api.anthropic.com/v1'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GLM_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1'
const OPENAI_BASE_URL = 'https://api.openai.com/v1'

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
  bypassSavedSetting?: boolean
  messages?: Message[]
  model?: string
  provider?: string
  responseFormat?: string
}

type RuntimeConfig = {
  anonymousRateLimitPerWindow: number
  claudeApiKey: string
  claudeBaseUrl: string
  authenticatedRateLimitPerWindow: number
  deepseekApiKey: string
  deepseekBaseUrl: string
  defaultClaudeModel: string
  defaultDeepseekModel: string
  defaultGeminiModel: string
  defaultGlmModel: string
  defaultKimiModel: string
  defaultLlmProvider: string
  defaultOpenaiModel: string
  geminiApiKey: string
  geminiBaseUrl: string
  glmApiKey: string
  glmBaseUrl: string
  kimiApiKey: string
  kimiBaseUrl: string
  modelAllowlist: Record<ChatProvider, string[]>
  openaiApiKey: string
  openaiBaseUrl: string
  providerSettingsEncryptionKey: string
  rateLimitWindowMs: number
  supabaseAnonKey: string
  supabaseUrl: string
}

type ProviderOptions = {
  apiKey: string
  baseUrl: string
  model: string
  responseFormat?: ResponseFormat
}

type SupabaseAuthUser = {
  id?: string
  is_anonymous?: boolean
}

type ProviderSettingRow = {
  api_key_ciphertext: string
  api_key_iv: string
  base_url: string | null
  model: string | null
  provider: string
  user_id: string
}

type SaveProviderSettingBody = {
  apiKey?: string
  baseUrl?: string
  model?: string
  provider?: string
}

type ValidProviderSettingBody = {
  apiKey: string
  baseUrl?: string
  model: string
  provider: ChatProvider
}

function parsePositiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readConfig(env: RuntimeEnv): RuntimeConfig {
  const get = (name: string) => env.get(name)?.trim() ?? ''

  return {
    anonymousRateLimitPerWindow: parsePositiveInteger(get('LLM_ANONYMOUS_RATE_LIMIT_PER_WINDOW'), DEFAULT_ANONYMOUS_RATE_LIMIT_PER_WINDOW),
    authenticatedRateLimitPerWindow: parsePositiveInteger(get('LLM_AUTHENTICATED_RATE_LIMIT_PER_WINDOW'), DEFAULT_AUTHENTICATED_RATE_LIMIT_PER_WINDOW),
    claudeApiKey: get('CLAUDE_API_KEY'),
    claudeBaseUrl: get('CLAUDE_BASE_URL') || CLAUDE_BASE_URL,
    deepseekApiKey: get('DEEPSEEK_API_KEY'),
    deepseekBaseUrl: get('DEEPSEEK_BASE_URL') || DEEPSEEK_BASE_URL,
    defaultClaudeModel: get('DEFAULT_CLAUDE_MODEL') || DEFAULT_CLAUDE_MODEL,
    defaultDeepseekModel: get('DEFAULT_DEEPSEEK_MODEL') || DEFAULT_DEEPSEEK_MODEL,
    defaultGeminiModel: get('DEFAULT_GEMINI_MODEL') || DEFAULT_GEMINI_MODEL,
    defaultGlmModel: get('DEFAULT_GLM_MODEL') || DEFAULT_GLM_MODEL,
    defaultKimiModel: get('DEFAULT_KIMI_MODEL') || DEFAULT_KIMI_MODEL,
    defaultLlmProvider: get('DEFAULT_LLM_PROVIDER') || DEFAULT_LLM_PROVIDER,
    defaultOpenaiModel: get('DEFAULT_OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
    geminiApiKey: get('GEMINI_API_KEY'),
    geminiBaseUrl: get('GEMINI_BASE_URL') || GEMINI_BASE_URL,
    glmApiKey: get('GLM_API_KEY'),
    glmBaseUrl: get('GLM_BASE_URL') || GLM_BASE_URL,
    kimiApiKey: get('KIMI_API_KEY'),
    kimiBaseUrl: get('KIMI_BASE_URL') || KIMI_BASE_URL,
    modelAllowlist: {
      claude: parseModelAllowlist('claude', get('LLM_MODEL_ALLOWLIST_CLAUDE')),
      custom_openai: parseModelAllowlist('custom_openai', get('LLM_MODEL_ALLOWLIST_CUSTOM_OPENAI')),
      deepseek: parseModelAllowlist('deepseek', get('LLM_MODEL_ALLOWLIST_DEEPSEEK')),
      gemini: parseModelAllowlist('gemini', get('LLM_MODEL_ALLOWLIST_GEMINI')),
      glm: parseModelAllowlist('glm', get('LLM_MODEL_ALLOWLIST_GLM')),
      kimi: parseModelAllowlist('kimi', get('LLM_MODEL_ALLOWLIST_KIMI')),
      openai: parseModelAllowlist('openai', get('LLM_MODEL_ALLOWLIST_OPENAI')),
    },
    openaiApiKey: get('OPENAI_API_KEY'),
    openaiBaseUrl: get('OPENAI_BASE_URL') || OPENAI_BASE_URL,
    providerSettingsEncryptionKey: get('LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY'),
    rateLimitWindowMs: parsePositiveInteger(get('LLM_RATE_LIMIT_WINDOW_MS'), DEFAULT_RATE_LIMIT_WINDOW_MS),
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

function errorBody(name: ErrorCode, message: string): ErrorResponse {
  return {
    error: {
      message,
      name,
    },
  }
}

function errorResponse(status: number, name: ErrorCode, message: string) {
  return jsonResponse(status, errorBody(name, message))
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

function validateMessages(messages: Message[] | undefined): messages is Message[] {
  return Array.isArray(messages) && messages.length > 0 && messages.every((message) => {
    const validRole = message?.role === 'system' || message?.role === 'user' || message?.role === 'assistant'
    return validRole && typeof message?.content === 'string' && message.content.trim().length > 0
  })
}

function isSystemDeepSeekTestRequest(body: RequestBody, config: RuntimeConfig) {
  return body.bypassSavedSetting === true
    && body.provider === 'deepseek'
    && (!body.model || body.model.trim() === config.defaultDeepseekModel)
    && body.messages?.length === 1
    && body.messages[0]?.role === 'user'
    && body.messages[0]?.content.trim() === '请只回复 OK，用于测试模型服务连通性。'
}

function normalizeResponseFormat(responseFormat: string | undefined): ResponseFormat | undefined {
  if (responseFormat === 'text' || responseFormat === 'json_object') {
    return responseFormat
  }

  return undefined
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null && 'error' in value
}

function isTimeoutError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  return error instanceof Error && error.name === 'AbortError'
}

function getProvider(body: RequestBody, config: RuntimeConfig): ChatProvider | ErrorResponse {
  const requestedProvider = body.provider?.trim()
  const provider = requestedProvider || config.defaultLlmProvider

  if (!isChatProvider(provider)) {
    return requestedProvider
      ? errorBody('LLMInvalidRequestError', 'Unsupported LLM provider.')
      : errorBody('ConfigurationError', 'DEFAULT_LLM_PROVIDER is invalid.')
  }

  if (provider === 'custom_openai') {
    return errorBody('LLMInvalidRequestError', 'Custom provider requires a saved user setting.')
  }

  return provider
}

function getServerProviderOptions(provider: ChatProvider, body: RequestBody, config: RuntimeConfig): ProviderOptions | ErrorResponse {
  if (provider === 'gemini') {
    return config.geminiApiKey
      ? { apiKey: config.geminiApiKey, baseUrl: config.geminiBaseUrl, model: body.model?.trim() || config.defaultGeminiModel, responseFormat: normalizeResponseFormat(body.responseFormat) }
      : errorBody('ConfigurationError', 'GEMINI_API_KEY is not configured.')
  }

  if (provider === 'claude') {
    return config.claudeApiKey
      ? { apiKey: config.claudeApiKey, baseUrl: config.claudeBaseUrl, model: body.model?.trim() || config.defaultClaudeModel, responseFormat: normalizeResponseFormat(body.responseFormat) }
      : errorBody('ConfigurationError', 'CLAUDE_API_KEY is not configured.')
  }

  if (provider === 'openai') {
    return config.openaiApiKey
      ? { apiKey: config.openaiApiKey, baseUrl: config.openaiBaseUrl, model: body.model?.trim() || config.defaultOpenaiModel, responseFormat: normalizeResponseFormat(body.responseFormat) }
      : errorBody('ConfigurationError', 'OPENAI_API_KEY is not configured.')
  }

  if (provider === 'glm') {
    return config.glmApiKey
      ? { apiKey: config.glmApiKey, baseUrl: config.glmBaseUrl, model: body.model?.trim() || config.defaultGlmModel, responseFormat: normalizeResponseFormat(body.responseFormat) }
      : errorBody('ConfigurationError', 'GLM_API_KEY is not configured.')
  }

  if (provider === 'kimi') {
    return config.kimiApiKey
      ? { apiKey: config.kimiApiKey, baseUrl: config.kimiBaseUrl, model: body.model?.trim() || config.defaultKimiModel, responseFormat: normalizeResponseFormat(body.responseFormat) }
      : errorBody('ConfigurationError', 'KIMI_API_KEY is not configured.')
  }

  if (provider === 'custom_openai') {
    return errorBody('LLMInvalidRequestError', 'Custom provider requires a saved user setting.')
  }

  return config.deepseekApiKey
    ? { apiKey: config.deepseekApiKey, baseUrl: config.deepseekBaseUrl, model: body.model?.trim() || config.defaultDeepseekModel, responseFormat: normalizeResponseFormat(body.responseFormat) }
    : errorBody('ConfigurationError', 'DEEPSEEK_API_KEY is not configured.')
}

function getPresetBaseUrl(provider: ChatProvider, config: RuntimeConfig) {
  if (provider === 'gemini') return config.geminiBaseUrl
  if (provider === 'claude') return config.claudeBaseUrl
  if (provider === 'openai') return config.openaiBaseUrl
  if (provider === 'glm') return config.glmBaseUrl
  if (provider === 'kimi') return config.kimiBaseUrl
  return config.deepseekBaseUrl
}

function toPublicSetting(row: ProviderSettingRow | null) {
  if (!row) {
    return {
      keySet: false,
      mode: 'system',
      provider: 'deepseek',
    }
  }

  return {
    baseUrl: row.provider === 'custom_openai' ? row.base_url : undefined,
    keySet: true,
    mode: 'user',
    model: row.model ?? undefined,
    provider: row.provider,
  }
}

function getSettingsUrl(config: RuntimeConfig, userId: string, select = '*') {
  const params = new URLSearchParams({
    limit: '1',
    select,
    user_id: `eq.${userId}`,
  })

  return `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/llm_provider_settings?${params.toString()}`
}

function getRestHeaders(config: RuntimeConfig, token: string, json = false) {
  const headers: Record<string, string> = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${token}`,
  }

  if (json) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

async function loadProviderSetting(config: RuntimeConfig, token: string, userId: string, runtimeFetch: RuntimeFetch) {
  const response = await runtimeFetch(getSettingsUrl(config, userId, 'user_id, provider, base_url, model, api_key_ciphertext, api_key_iv'), {
    headers: getRestHeaders(config, token),
    method: 'GET',
  })

  if (!response.ok) {
    return errorBody('ConfigurationError', 'Provider settings could not be loaded.')
  }

  const rows = await response.json() as ProviderSettingRow[]
  const row = Array.isArray(rows) ? rows[0] : null

  if (!row) {
    return null
  }

  return isChatProvider(row.provider) ? row : errorBody('LLMInvalidRequestError', 'Unsupported saved LLM provider.')
}

function encodeBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function decodeBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function getEncryptionKey(secret: string) {
  const keyMaterial = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, ['decrypt', 'encrypt'])
}

async function encryptApiKey(apiKey: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await getEncryptionKey(secret)
  const ciphertext = await crypto.subtle.encrypt({ iv, name: 'AES-GCM' }, key, new TextEncoder().encode(apiKey))

  return {
    api_key_ciphertext: encodeBase64(new Uint8Array(ciphertext)),
    api_key_iv: encodeBase64(iv),
  }
}

async function decryptApiKey(row: ProviderSettingRow, secret: string) {
  const key = await getEncryptionKey(secret)
  const plaintext = await crypto.subtle.decrypt(
    {
      iv: decodeBase64(row.api_key_iv),
      name: 'AES-GCM',
    },
    key,
    decodeBase64(row.api_key_ciphertext),
  )

  return new TextDecoder().decode(plaintext)
}

function normalizeHttpsBaseUrl(baseUrl: string | undefined) {
  const value = baseUrl?.trim() ?? ''

  try {
    const parsed = new URL(value)
    const hasCredentials = parsed.username.length > 0 || parsed.password.length > 0

    if (parsed.protocol !== 'https:' || hasCredentials || !parsed.hostname) {
      return null
    }

    parsed.hash = ''
    parsed.search = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function validateSettingBody(body: SaveProviderSettingBody): ValidProviderSettingBody | ErrorResponse {
  const provider = body.provider?.trim()
  const apiKey = body.apiKey?.trim()

  if (!isChatProvider(provider) || !apiKey) {
    return errorBody('LLMInvalidRequestError', 'Provider and API key are required.')
  }

  if (isPresetProvider(provider)) {
    const model = body.model?.trim()

    if (body.baseUrl?.trim() || !model) {
      return errorBody('LLMInvalidRequestError', 'Preset providers require model and cannot override base URL.')
    }

    return { apiKey, model, provider }
  }

  const baseUrl = normalizeHttpsBaseUrl(body.baseUrl)
  const model = body.model?.trim()

  if (!baseUrl || !model) {
    return errorBody('LLMInvalidRequestError', 'Custom provider requires HTTPS base URL and model.')
  }

  return {
    apiKey,
    baseUrl,
    model,
    provider,
  }
}

async function saveProviderSetting(
  body: SaveProviderSettingBody,
  config: RuntimeConfig,
  token: string,
  userId: string,
  runtimeFetch: RuntimeFetch,
) {
  if (!config.providerSettingsEncryptionKey) {
    return errorBody('ConfigurationError', 'LLM provider settings encryption is not configured.')
  }

  const validBody = validateSettingBody(body)

  if ('error' in validBody) {
    return validBody
  }

  const encrypted = await encryptApiKey(validBody.apiKey, config.providerSettingsEncryptionKey)
  const row: ProviderSettingRow = {
    ...encrypted,
    base_url: validBody.provider === 'custom_openai' ? validBody.baseUrl ?? null : null,
    model: validBody.model,
    provider: validBody.provider,
    user_id: userId,
  }
  const params = new URLSearchParams({
    on_conflict: 'user_id',
    select: 'user_id, provider, base_url, model, api_key_ciphertext, api_key_iv',
  })
  const response = await runtimeFetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/llm_provider_settings?${params.toString()}`, {
    body: JSON.stringify(row),
    headers: {
      ...getRestHeaders(config, token, true),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    method: 'POST',
  })

  if (!response.ok) {
    return errorBody('ConfigurationError', 'Provider settings could not be saved.')
  }

  return toPublicSetting(row)
}

async function deleteProviderSetting(config: RuntimeConfig, token: string, userId: string, runtimeFetch: RuntimeFetch) {
  const response = await runtimeFetch(getSettingsUrl(config, userId), {
    headers: getRestHeaders(config, token),
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 204) {
    return errorBody('ConfigurationError', 'Provider settings could not be reset.')
  }

  return toPublicSetting(null)
}

async function getUserProviderOptions(row: ProviderSettingRow, config: RuntimeConfig): Promise<ProviderBuildOptions | ErrorResponse> {
  if (!config.providerSettingsEncryptionKey) {
    return errorBody('ConfigurationError', 'LLM provider settings encryption is not configured.')
  }

  const provider = row.provider

  if (!isChatProvider(provider)) {
    return errorBody('LLMInvalidRequestError', 'Unsupported saved LLM provider.')
  }

  const apiKey = await decryptApiKey(row, config.providerSettingsEncryptionKey)
  const baseUrl = provider === 'custom_openai' ? row.base_url?.trim() : getPresetBaseUrl(provider, config)
  const model = row.model?.trim()

  if (!apiKey || !baseUrl || !model) {
    return errorBody('ConfigurationError', 'Saved LLM provider setting is incomplete.')
  }

  return {
    apiKey,
    baseUrl,
    model,
  }
}

async function fetchUpstream(
  provider: ChatProvider,
  providerRequest: ProviderRequest,
  runtimeFetch: RuntimeFetch,
  timeoutMs: number,
) {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort('timeout'), timeoutMs)

  try {
    const upstreamResponse = await runtimeFetch(providerRequest.url, {
      ...providerRequest.init,
      signal: abortController.signal,
    })

    if (!upstreamResponse.ok) {
      const mappedError = mapProviderError(upstreamResponse.status)
      logger.error('upstream_request_failed', { provider, status: mappedError.status, upstream_status: upstreamResponse.status })
      return errorResponse(mappedError.status, mappedError.name, `${provider} API request failed.`)
    }

    const payload = await upstreamResponse.json()
    const text = extractProviderText(provider, payload)

    if (!text) {
      return errorResponse(502, 'LLMInvalidResponseError', `${provider} returned an invalid response payload.`)
    }

    return jsonResponse(200, { model: providerRequest.model, text })
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.warn('upstream_request_timeout', { provider })
      return errorResponse(504, 'LLMTimeoutError', `${provider} API request timed out.`)
    }

    logger.error('upstream_request_error', { provider })
    return errorResponse(502, 'LLMUpstreamError', `${provider} API request failed.`)
  } finally {
    clearTimeout(timeoutId)
  }
}

export function createLlmProxyHandler(options: HandlerOptions) {
  const runtimeFetch = options.fetch ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS

  return async function handleLlmProxyRequest(request: Request) {
    const config = readConfig(options.env)
    const url = new URL(request.url)
    const isSettingsRequest = url.pathname.endsWith('/settings')

    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const token = extractBearerToken(request)

    if (!token) {
      return errorResponse(401, 'AuthError', 'Missing Supabase bearer token.')
    }

    let user: SupabaseAuthUser

    try {
      const verifiedUser = await verifyJwt(token, config, runtimeFetch)

      if (!isSupabaseAuthUser(verifiedUser)) {
        return errorResponse(401, 'AuthError', 'Invalid Supabase session.')
      }

      user = verifiedUser

      const memoryLimit = user.is_anonymous === true ? config.anonymousRateLimitPerWindow : config.authenticatedRateLimitPerWindow

      if (!checkUserRateLimit(user, request, memoryLimit, config.rateLimitWindowMs)) {
        logger.warn('rate_limit_exceeded', { layer: 'memory' })
        return errorResponse(429, 'LLMRateLimitError', 'LLM request rate limit exceeded.')
      }
    } catch {
      return errorResponse(500, 'ConfigurationError', 'Supabase auth verification failed.')
    }

    if (isSettingsRequest) {
      if (request.method === 'GET') {
        const setting = await loadProviderSetting(config, token, user.id ?? '', runtimeFetch)
        return isErrorResponse(setting) ? jsonResponse(500, setting) : jsonResponse(200, toPublicSetting(setting))
      }

      if (request.method === 'DELETE') {
        const result = await deleteProviderSetting(config, token, user.id ?? '', runtimeFetch)
        return isErrorResponse(result) ? jsonResponse(500, result) : jsonResponse(200, result)
      }

      if (request.method === 'PUT') {
        let settingsBody: SaveProviderSettingBody

        try {
          settingsBody = await request.json()
        } catch {
          return errorResponse(400, 'LLMInvalidRequestError', 'Request body must be valid JSON.')
        }

        const result = await saveProviderSetting(settingsBody, config, token, user.id ?? '', runtimeFetch)
        const status = isErrorResponse(result) && result.error.name === 'LLMInvalidRequestError' ? 400 : 200

        return isErrorResponse(result) ? jsonResponse(status, result) : jsonResponse(200, result)
      }

      return errorResponse(405, 'LLMInvalidRequestError', 'Only GET, PUT, and DELETE are supported for settings.')
    }

    if (request.method !== 'POST') {
      return errorResponse(405, 'LLMInvalidRequestError', 'Only POST is supported.')
    }

    let body: RequestBody

    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'LLMInvalidRequestError', 'Request body must be valid JSON.')
    }

    if (!validateMessages(body.messages)) {
      return errorResponse(400, 'LLMInvalidRequestError', 'messages must be a non-empty array of valid chat messages.')
    }

    const bypassSavedSetting = isSystemDeepSeekTestRequest(body, config)

    if (body.bypassSavedSetting === true && !bypassSavedSetting) {
      return errorResponse(400, 'LLMInvalidRequestError', 'Saved provider settings can only be bypassed for the system DeepSeek test.')
    }

    const savedSetting = bypassSavedSetting
      ? null
      : await loadProviderSetting(config, token, user.id ?? '', runtimeFetch)

    if (isErrorResponse(savedSetting)) {
      return jsonResponse(savedSetting.error.name === 'ConfigurationError' ? 500 : 400, savedSetting)
    }

    const provider = savedSetting?.provider && isChatProvider(savedSetting.provider)
      ? savedSetting.provider
      : getProvider(body, config)

    if (typeof provider !== 'string') {
      return jsonResponse(provider.error.name === 'ConfigurationError' ? 500 : 400, provider)
    }

    const providerOptions = savedSetting
      ? await getUserProviderOptions(savedSetting, config)
      : getServerProviderOptions(provider, body, config)

    if (isErrorResponse(providerOptions)) {
      return jsonResponse(providerOptions.error.name === 'ConfigurationError' ? 500 : 400, providerOptions)
    }

    if (!isModelAllowed(provider, providerOptions.model, config.modelAllowlist)) {
      return errorResponse(400, 'LLMInvalidRequestError', `Model '${providerOptions.model}' is not allowed for provider '${provider}'.`)
    }

    const planQuota = await resolvePlanQuota(config, token, user, runtimeFetch)

    if (!(await enforceDurableRateLimit(config, token, user, 'llm_chat', runtimeFetch, { planQuota }))) {
      logger.warn('rate_limit_exceeded', { layer: planQuota?.aiChatQuota !== null && planQuota !== null ? 'plan_quota' : 'ledger' })
      return errorResponse(429, 'LLMRateLimitError', 'LLM request rate limit exceeded.')
    }

    const providerRequest = buildProviderRequest(provider, body.messages, {
      ...providerOptions,
      responseFormat: normalizeResponseFormat(body.responseFormat),
    })

    return fetchUpstream(provider, providerRequest, runtimeFetch, timeoutMs)
  }
}
