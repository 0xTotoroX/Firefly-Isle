/**
 * [INPUT]: 依赖 provider-adapters 的 ChatProvider 类型、_shared/usage-limits 的台账读写与注入的 runtime fetch。
 * [OUTPUT]: 对外提供 parseModelAllowlist、isModelAllowed、checkMemoryRateLimit、enforceDurableRateLimit 与 ModelAllowlistConfig 类型。
 * [POS]: supabase/functions/llm-proxy 的限流与模型白名单边界层，双层限流（进程内 + 台账）与 provider 模型前缀白名单收敛在一处。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { countUsageInWindow, recordUsageEvent, type UsageEventKind, type UsageRuntimeFetch } from '../_shared/usage-limits.ts'
import type { ChatProvider } from './provider-adapters.ts'

type RateLimitBucket = {
  count: number
  windowStartedAt: number
}

type RateLimitUser = {
  id?: string
  is_anonymous?: boolean
}

export type ModelAllowlistConfig = Record<ChatProvider, string[]>

export type DurableLimitRuntimeConfig = {
  authenticatedRateLimitPerWindow: number
  anonymousRateLimitPerWindow: number
  rateLimitWindowMs: number
  supabaseAnonKey: string
  supabaseUrl: string
}

const rateLimitBuckets = new Map<string, RateLimitBucket>()

// 各 preset provider 默认只放行其模型名前缀；custom_openai 由用户自带端点，不做限制。
// 运维可用 LLM_MODEL_ALLOWLIST_<PROVIDER>（逗号分隔前缀）覆盖，`*` 表示该 provider 不限制。
const DEFAULT_MODEL_ALLOWLIST: Record<ChatProvider, string[]> = {
  claude: ['claude-'],
  custom_openai: [],
  deepseek: ['deepseek-'],
  gemini: ['gemini-'],
  glm: ['glm-'],
  kimi: ['kimi-', 'moonshot-'],
  openai: ['gpt-', 'o1', 'o3', 'o4'],
}

export function parseModelAllowlist(provider: ChatProvider, raw: string): string[] {
  if (!raw) {
    return DEFAULT_MODEL_ALLOWLIST[provider]
  }

  const entries = raw.split(',').map((entry) => entry.trim()).filter(Boolean)

  return entries.includes('*') ? [] : entries
}

export function isModelAllowed(provider: ChatProvider, model: string, config: ModelAllowlistConfig) {
  const allowlist = config[provider]

  if (allowlist.length === 0) {
    return true
  }

  return allowlist.some((prefix) => model.startsWith(prefix))
}

export function checkMemoryRateLimit(bucketKey: string, limit: number, windowMs: number, now = Date.now()) {
  const current = rateLimitBuckets.get(bucketKey)

  if (!current || now - current.windowStartedAt >= windowMs) {
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      windowStartedAt: now,
    })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count += 1
  return true
}

export function checkUserRateLimit(user: RateLimitUser, request: Request, limit: number, windowMs: number) {
  const isAnonymous = user.is_anonymous === true
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = request.headers.get('cf-connecting-ip')?.trim() || forwardedFor || 'unknown'
  const bucketKey = `${isAnonymous ? 'anonymous' : 'authenticated'}:${user.id}:${ip}`

  return checkMemoryRateLimit(bucketKey, limit, windowMs)
}

// 台账层跨 isolate 持久计数；台账查询失败时 fail-open，仅退回进程内限流。
export async function enforceDurableRateLimit(
  config: DurableLimitRuntimeConfig,
  token: string,
  user: RateLimitUser,
  kind: UsageEventKind,
  runtimeFetch: UsageRuntimeFetch,
) {
  const limit = user.is_anonymous === true ? config.anonymousRateLimitPerWindow : config.authenticatedRateLimitPerWindow

  if (!config.supabaseUrl || !config.supabaseAnonKey || !user.id) {
    return true
  }

  const ledgerConfig = {
    supabaseAnonKey: config.supabaseAnonKey,
    supabaseUrl: config.supabaseUrl,
    userToken: token,
  }

  const used = await countUsageInWindow(ledgerConfig, kind, user.id, config.rateLimitWindowMs, runtimeFetch)

  if (used !== null && used >= limit) {
    return false
  }

  await recordUsageEvent(ledgerConfig, kind, runtimeFetch)

  return true
}
