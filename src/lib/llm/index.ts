/**
 * [INPUT]: 依赖 @/lib/auth 的当前 Supabase session，依赖 @/lib/supabase 的 Edge Function env 边界，依赖 ./types。
 * [OUTPUT]: 对外提供 chat(messages, options) 与相关类型导出。
 * [POS]: src/lib/llm 的统一前端调用入口，把 JWT 透传、请求协议与错误映射锁在一处。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { getSupabaseClient, hasSupabaseEnv, hasSupabaseFunctionEnv, supabaseEdgeFunctionUrl } from '@/lib/supabase'
import { isBrowserOffline } from '@/lib/network-status'

import {
  ChatError,
  type ChatErrorPayload,
  type ChatOptions,
  type ChatResult,
  type ChatSuccessPayload,
  type Message,
} from './types'

export type { ChatOptions, Message } from './types'
export { ChatError } from './types'

function buildUrl() {
  return `${supabaseEdgeFunctionUrl.replace(/\/$/, '')}/llm-proxy`
}

function ensureConfigured() {
  if (!hasSupabaseEnv || !hasSupabaseFunctionEnv) {
    throw new ChatError('ConfigurationError', 'Missing Supabase LLM environment variables.')
  }
}

async function getAccessToken() {
  const { data, error } = await getSupabaseClient().auth.getSession()

  if (error || !data.session?.access_token) {
    throw new ChatError('AuthError', 'Missing Supabase session for LLM request.')
  }

  return data.session.access_token
}

function validateMessages(messages: Message[]) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ChatError('LLMInvalidRequestError', 'messages must be a non-empty array.')
  }

  for (const message of messages) {
    const validRole = message.role === 'system' || message.role === 'user' || message.role === 'assistant'

    if (!validRole || typeof message.content !== 'string' || message.content.trim().length === 0) {
      throw new ChatError('LLMInvalidRequestError', 'Every message must include a valid role and non-empty content.')
    }
  }
}

function toChatError(payload: ChatErrorPayload, status: number) {
  const name = payload?.error?.name
  const message = payload?.error?.message

  if (typeof name === 'string' && typeof message === 'string') {
    return new ChatError(name as ChatError['name'], message, status)
  }

  return new ChatError('LLMInvalidResponseError', 'LLM proxy returned an invalid error payload.', status)
}

function toChatResult(payload: ChatSuccessPayload): ChatResult {
  if (typeof payload?.text !== 'string' || typeof payload?.model !== 'string') {
    throw new ChatError('LLMInvalidResponseError', 'LLM proxy returned an invalid success payload.')
  }

  return {
    model: payload.model,
    text: payload.text,
  }
}

export async function chat(messages: Message[], options?: ChatOptions): Promise<string> {
  ensureConfigured()
  validateMessages(messages)

  if (isBrowserOffline()) {
    throw new ChatError('LLMNetworkUnavailableError', 'Network connection is required for LLM requests.')
  }

  const accessToken = await getAccessToken()
  const response = await fetch(buildUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model: options?.model,
      provider: options?.provider,
      responseFormat: options?.responseFormat,
    }),
  })

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    throw new ChatError('LLMInvalidResponseError', 'LLM proxy returned non-JSON content.', response.status)
  }

  if (!response.ok) {
    throw toChatError(payload as ChatErrorPayload, response.status)
  }

  return toChatResult(payload as ChatSuccessPayload).text
}
