/**
 * [INPUT]: 依赖 provider-adapters 的 ChatProvider 类型。
 * [OUTPUT]: 对外提供 parseModelAllowlist、isModelAllowed 与 ModelAllowlistConfig。
 * [POS]: provider 模型前缀白名单；用量限制统一由 _shared/usage-limits 与数据库处理。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { ChatProvider } from './provider-adapters.ts'

export type ModelAllowlistConfig = Record<ChatProvider, string[]>

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
