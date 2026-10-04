/**
 * [INPUT]: 无运行时依赖，只定义前端 LLM adapter 的公共消息、参数与错误类型。
 * [OUTPUT]: 对外提供 Message、ChatProvider、ChatResponseFormat、ChatOptions、ChatErrorName、ChatError 与 ChatResult 类型。
 * [POS]: src/lib/llm 的类型边界文件，被 chat 封装与上层业务共同消费。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatProvider = 'gemini' | 'claude' | 'openai' | 'glm' | 'deepseek' | 'kimi' | 'custom_openai'

export type ChatResponseFormat = 'text' | 'json_object'

export type ChatOptions = {
  model?: string
  provider?: ChatProvider
  responseFormat?: ChatResponseFormat
}

export type ChatErrorName =
  | 'AuthError'
  | 'ConfigurationError'
  | 'LLMInvalidRequestError'
  | 'LLMInvalidResponseError'
  | 'LLMNetworkUnavailableError'
  | 'LLMRateLimitError'
  | 'LLMTimeoutError'
  | 'LLMUpstreamError'

export type ChatErrorPayload = {
  error?: {
    message?: string
    name?: string
  }
}

export type ChatSuccessPayload = {
  model?: string
  text?: string
}

export class ChatError extends Error {
  name: ChatErrorName
  status?: number

  constructor(name: ChatErrorName, message: string, status?: number) {
    super(message)
    this.name = name
    this.status = status
  }
}

export type ChatResult = {
  model: string
  text: string
}
