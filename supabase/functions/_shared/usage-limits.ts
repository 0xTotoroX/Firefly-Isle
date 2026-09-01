/**
 * [INPUT]: 依赖 Supabase REST（usage_events 查询与 record_usage RPC）与注入的 runtime fetch。
 * [OUTPUT]: 对外提供 countUsageInWindow 与 recordUsageEvent。
 * [POS]: supabase/functions 的共享用量台账边界，跨 isolate 持久限流的读写两侧；任何台账故障都 fail-open 并返回 null/false，不阻塞推理可用性。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type UsageRuntimeFetch = (input: string | URL, init?: RequestInit) => Promise<Response>

export type UsageLedgerConfig = {
  supabaseAnonKey: string
  supabaseUrl: string
  userToken: string
}

export type UsageEventKind = 'export_account' | 'llm_chat' | 'ocr_document' | 'record_share'

export async function countUsageInWindow(
  config: UsageLedgerConfig,
  kind: UsageEventKind,
  userId: string,
  windowMs: number,
  runtimeFetch: UsageRuntimeFetch,
  now = Date.now(),
): Promise<number | null> {
  try {
    const windowStart = new Date(now - windowMs).toISOString()
    const query = [
      'select=created_at',
      `kind=eq.${kind}`,
      `user_id=eq.${encodeURIComponent(userId)}`,
      `created_at=gte.${encodeURIComponent(windowStart)}`,
    ].join('&')
    const response = await runtimeFetch(`${config.supabaseUrl}/rest/v1/usage_events?${query}`, {
      headers: {
        Prefer: 'count=exact',
        Range: '0-0',
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.userToken}`,
      },
    })

    if (!response.ok && response.status !== 206) {
      return null
    }

    const total = response.headers.get('content-range')?.split('/')[1] ?? ''

    if (!total || total === '*') {
      return null
    }

    const parsed = Number.parseInt(total, 10)

    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function recordUsageEvent(
  config: UsageLedgerConfig,
  kind: UsageEventKind,
  runtimeFetch: UsageRuntimeFetch,
  meta?: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await runtimeFetch(`${config.supabaseUrl}/rest/v1/rpc/record_usage`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meta ? { event_kind: kind, event_meta: meta } : { event_kind: kind }),
    })

    return response.ok
  } catch {
    return false
  }
}
