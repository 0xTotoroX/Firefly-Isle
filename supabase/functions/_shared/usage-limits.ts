/**
 * [INPUT]: 依赖 Supabase consume_usage 原子 RPC 与注入的 runtime fetch。
 * [OUTPUT]: 对外提供 consumeUsage；区分获准、额度拒绝与服务不可用。
 * [POS]: 模型/OCR 共用的配额边界，数据库故障或响应不合法时停止调用上游。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export type UsageRuntimeFetch = (input: string | URL, init?: RequestInit) => Promise<Response>

export type UsageLedgerConfig = {
  supabaseAnonKey: string
  supabaseUrl: string
  userToken: string
}

export type UsageEventKind = 'llm_chat' | 'ocr_document'
export type UsageDecision = 'allowed' | 'window' | 'quota' | 'unavailable'

export async function consumeUsage(
  config: UsageLedgerConfig,
  kind: UsageEventKind,
  runtimeFetch: UsageRuntimeFetch,
): Promise<UsageDecision> {
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.userToken) {
    return 'unavailable'
  }

  try {
    const response = await runtimeFetch(`${config.supabaseUrl}/rest/v1/rpc/consume_usage`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_kind: kind }),
    })

    if (!response.ok) return 'unavailable'
    const result: unknown = await response.json()
    if (!result || typeof result !== 'object' || !('allowed' in result) || !('reason' in result)) return 'unavailable'
    if (result.allowed === true && result.reason === null) return 'allowed'
    if (result.allowed === false && (result.reason === 'window' || result.reason === 'quota')) return result.reason
    return 'unavailable'
  } catch {
    return 'unavailable'
  }
}
