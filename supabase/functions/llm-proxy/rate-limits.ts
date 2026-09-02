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

// plan 月度配额用 30 天滚动窗口近似（usage_events 按时间过滤）。
export const PLAN_QUOTA_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

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

export type PlanQuota = {
  aiChatQuota: number | null
  planId: 'free' | 'pro'
}

// 读取用户订阅的 plan 配额；subscriptions 未迁移或无订阅行时按 free 档处理，
// 台账读取失败时返回 null（fail-open 到窗口限流，不阻塞推理）。
export async function resolvePlanQuota(
  config: DurableLimitRuntimeConfig,
  token: string,
  user: RateLimitUser,
  runtimeFetch: UsageRuntimeFetch,
): Promise<PlanQuota | null> {
  if (!config.supabaseUrl || !config.supabaseAnonKey || !user.id) {
    return null
  }

  try {
    const query = [
      'select=plan_id,plans(ai_chat_quota)',
      `user_id=eq.${encodeURIComponent(user.id)}`,
      'limit=1',
    ].join('&')
    const response = await runtimeFetch(`${config.supabaseUrl}/rest/v1/subscriptions?${query}`, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const rows = (await response.json()) as Array<{ plan_id: string; plans?: { ai_chat_quota: number } | Array<{ ai_chat_quota: number }> | null }>

    if (!Array.isArray(rows) || rows.length === 0) {
      return { aiChatQuota: null, planId: 'free' }
    }

    const row = rows[0]
    const planRow = Array.isArray(row.plans) ? row.plans[0] : row.plans
    const quota = typeof planRow?.ai_chat_quota === 'number' ? planRow.ai_chat_quota : null

    return { aiChatQuota: quota, planId: row.plan_id === 'pro' ? 'pro' : 'free' }
  } catch {
    return null
  }
}

// 台账层跨 isolate 持久计数；台账查询失败时 fail-open，仅退回进程内限流。
// quota 为 plan 月度配额（30 天滚动窗口近似）；null 表示未配置，仅执行窗口限流。
export async function enforceDurableRateLimit(
  config: DurableLimitRuntimeConfig,
  token: string,
  user: RateLimitUser,
  kind: UsageEventKind,
  runtimeFetch: UsageRuntimeFetch,
  options: { planQuota?: PlanQuota | null } = {},
) {
  const windowLimit = user.is_anonymous === true ? config.anonymousRateLimitPerWindow : config.authenticatedRateLimitPerWindow

  if (!config.supabaseUrl || !config.supabaseAnonKey || !user.id) {
    return true
  }

  const ledgerConfig = {
    supabaseAnonKey: config.supabaseAnonKey,
    supabaseUrl: config.supabaseUrl,
    userToken: token,
  }

  const quota = options.planQuota?.aiChatQuota ?? null
  const used = await countUsageInWindow(ledgerConfig, kind, user.id, quota !== null ? PLAN_QUOTA_WINDOW_MS : config.rateLimitWindowMs, runtimeFetch)

  if (used !== null) {
    if (quota !== null && used >= quota) {
      return false
    }

    if (quota === null && used >= windowLimit) {
      return false
    }
  }

  await recordUsageEvent(ledgerConfig, kind, runtimeFetch)

  return true
}
