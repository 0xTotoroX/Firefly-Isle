/**
 * [INPUT]: 依赖 Fetch RequestInit 结构与各 LLM provider 的 REST 请求协议。
 * [OUTPUT]: 对外提供 provider id、preset registry、请求构造、响应文本提取与错误映射工具。
 * [POS]: supabase/functions/llm-proxy 的 provider 适配层，被 handler.ts 调用以避免代理核心膨胀。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash'
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5'
export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'
export const DEFAULT_GLM_MODEL = 'glm-4.5-flash'
export const DEFAULT_KIMI_MODEL = 'moonshot-v1-8k'

export type ChatProvider = 'gemini' | 'claude' | 'openai' | 'glm' | 'deepseek' | 'kimi' | 'custom_openai'
export type PresetProvider = Exclude<ChatProvider, 'custom_openai'>
export type ResponseFormat = 'text' | 'json_object'

export type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ErrorCode =
  | 'AuthError'
  | 'ConfigurationError'
  | 'LLMInvalidRequestError'
  | 'LLMInvalidResponseError'
  | 'LLMRateLimitError'
  | 'LLMTimeoutError'
  | 'LLMUpstreamError'

export type ErrorResponse = {
  error: {
    message: string
    name: ErrorCode
  }
}

export type ProviderRequest = {
  init: RequestInit
  model: string
  url: string
}

export type ProviderBuildOptions = {
  apiKey: string
  baseUrl: string
  model: string
  responseFormat?: ResponseFormat
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}

type ClaudeResponse = {
  content?: Array<{
    text?: string
    type?: string
  }>
}

export const presetProviders: PresetProvider[] = ['gemini', 'claude', 'openai', 'glm', 'deepseek', 'kimi']

export function isChatProvider(provider: string | undefined): provider is ChatProvider {
  return provider === 'gemini'
    || provider === 'claude'
    || provider === 'openai'
    || provider === 'glm'
    || provider === 'deepseek'
    || provider === 'kimi'
    || provider === 'custom_openai'
}

export function isPresetProvider(provider: string | undefined): provider is PresetProvider {
  return provider !== 'custom_openai' && presetProviders.includes(provider as PresetProvider)
}

function collectSystemText(messages: Message[]) {
  return messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content.trim())
    .join('\n\n')
    .trim()
}

function toGeminiRequest(messages: Message[]) {
  const systemInstructionText = collectSystemText(messages)
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      parts: [{ text: message.content }],
      role: message.role === 'assistant' ? 'model' : 'user',
    }))

  if (contents.length === 0) {
    contents.push({
      parts: [{ text: systemInstructionText || 'Continue.' }],
      role: 'user',
    })
  }

  return {
    contents,
    systemInstruction: systemInstructionText ? { parts: [{ text: systemInstructionText }] } : undefined,
  }
}

function toClaudeRequest(messages: Message[], model: string) {
  return {
    max_tokens: 4096,
    messages: messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        content: message.content,
        role: message.role === 'assistant' ? 'assistant' : 'user',
      })),
    model,
    stream: false,
    system: collectSystemText(messages) || undefined,
  }
}

function toOpenAiCompatibleRequest(messages: Message[], options: ProviderBuildOptions) {
  const body: Record<string, unknown> = {
    messages,
    model: options.model,
    stream: false,
  }

  if (options.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' }
  }

  return body
}

function buildGeminiUrl(model: string, baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`
}

function buildChatCompletionsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`
}

export function buildProviderRequest(provider: ChatProvider, messages: Message[], options: ProviderBuildOptions): ProviderRequest {
  if (provider === 'gemini') {
    return {
      init: {
        body: JSON.stringify(toGeminiRequest(messages)),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': options.apiKey,
        },
        method: 'POST',
      },
      model: options.model,
      url: buildGeminiUrl(options.model, options.baseUrl),
    }
  }

  if (provider === 'claude') {
    return {
      init: {
        body: JSON.stringify(toClaudeRequest(messages, options.model)),
        headers: {
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'x-api-key': options.apiKey,
        },
        method: 'POST',
      },
      model: options.model,
      url: `${options.baseUrl.replace(/\/$/, '')}/messages`,
    }
  }

  return {
    init: {
      body: JSON.stringify(toOpenAiCompatibleRequest(messages, options)),
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
    model: options.model,
    url: buildChatCompletionsUrl(options.baseUrl),
  }
}

function extractGeminiText(payload: unknown): string | null {
  const text = (payload as GeminiResponse)?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text ?? '')
    .join('')
    .trim()

  return text ? text : null
}

function extractClaudeText(payload: unknown): string | null {
  const text = (payload as ClaudeResponse)?.content
    ?.filter((part) => part?.type === 'text' || typeof part?.text === 'string')
    .map((part) => part?.text ?? '')
    .join('')
    .trim()

  return text ? text : null
}

function extractOpenAiCompatibleText(payload: unknown): string | null {
  const text = (payload as OpenAiCompatibleResponse)?.choices?.[0]?.message?.content?.trim()
  return text ? text : null
}

export function extractProviderText(provider: ChatProvider, payload: unknown): string | null {
  if (provider === 'gemini') {
    return extractGeminiText(payload)
  }

  if (provider === 'claude') {
    return extractClaudeText(payload)
  }

  return extractOpenAiCompatibleText(payload)
}

export function mapProviderError(status: number): { name: ErrorCode; status: number } {
  if (status === 429) {
    return { name: 'LLMRateLimitError', status: 429 }
  }

  if (status === 400 || status === 422) {
    return { name: 'LLMInvalidRequestError', status: 400 }
  }

  if (status === 401 || status === 403) {
    return { name: 'ConfigurationError', status: 500 }
  }

  return { name: 'LLMUpstreamError', status: 502 }
}
