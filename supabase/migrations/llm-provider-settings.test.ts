/**
 * [INPUT]: 依赖 node:fs 读取 Supabase migration SQL。
 * [OUTPUT]: 对外提供 llm_provider_settings 迁移、provider/model 约束、RLS 与密钥字段合同测试。
 * [POS]: supabase/migrations 的 schema contract 测试，防止 provider key 明文列、model 约束或越权 policy 漂移。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./003_llm_provider_settings.sql', import.meta.url), 'utf8')

describe('llm_provider_settings migration', () => {
  it('stores encrypted API key material without plaintext key columns', () => {
    expect(migration).toContain('create table if not exists public.llm_provider_settings')
    expect(migration).toContain('api_key_ciphertext text not null')
    expect(migration).toContain('api_key_iv text not null')
    expect(migration).not.toMatch(/\bapi_key\s+text\b/i)
    expect(migration).not.toContain('api_key_plaintext')
  })

  it('constrains providers, requires model for user providers, and requires custom base URL', () => {
    for (const provider of ['gemini', 'claude', 'openai', 'glm', 'deepseek', 'kimi', 'custom_openai']) {
      expect(migration).toContain(`'${provider}'`)
    }

    expect(migration).toContain("provider = 'custom_openai'")
    expect(migration).toContain('base_url is not null')
    expect(migration.match(/model is not null/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('enables owner-scoped RLS for all write paths', () => {
    expect(migration).toContain('alter table public.llm_provider_settings enable row level security')

    for (const policy of [
      'llm_provider_settings_select_own',
      'llm_provider_settings_insert_own',
      'llm_provider_settings_update_own',
      'llm_provider_settings_delete_own',
    ]) {
      expect(migration).toContain(policy)
    }

    expect(migration.match(/user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(4)
  })
})
