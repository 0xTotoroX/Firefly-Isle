/**
 * [INPUT]: Supabase 客户端装配、浏览器存储与 mock 迁移函数。
 * [OUTPUT]: 云端会话保留、迁移前记录和存储不可用回退的回归。
 * [POS]: 客户端初始化兼容协议测试，不连接生产项目。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
/** Client initialization with isolated browser storage; no network or DOM required. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ createClient: vi.fn(() => ({})) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mock.createClient }))
const oldKey = 'sb-irkjblpzmclqekxbexll-auth-token'
const newKey = 'sb-supabase-auth-token'
const token = (origin: string) => `header.${btoa(JSON.stringify({ iss: `${origin}/auth/v1` }))}.signature`

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
  vi.stubGlobal('window', { get localStorage() { return storage } })
  vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.ghibli1024.com')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-public-key')
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('Supabase client migration wiring', () => {
  it('leaves cloud sessions untouched and never requests their migration refresh', async () => {
    const origin = 'https://irkjblpzmclqekxbexll.supabase.co'
    vi.stubEnv('VITE_SUPABASE_URL', origin)
    window.localStorage.setItem(oldKey, 'cloud-credential')
    const client = await import('./supabase')
    client.getSupabaseClient()
    expect(client.needsSupabaseSessionRefresh(token(origin))).toBe(false)
    expect(client.hasPendingSupabaseSessionMigration).toBe(false)
    expect(window.localStorage.getItem(newKey)).toBeNull()
  })

  it('records pending migration before SDK initialization and does not import after completion', async () => {
    const origin = 'https://irkjblpzmclqekxbexll.supabase.co'
    window.localStorage.setItem(oldKey, JSON.stringify({ access_token: token(origin), refresh_token: 'original' }))
    const client = await import('./supabase')
    client.getSupabaseClient()
    expect(client.hasPendingSupabaseSessionMigration).toBe(true)
    expect(client.needsSupabaseSessionRefresh(token(origin))).toBe(true)
    client.completeSupabaseSessionMigration(token('https://supabase.ghibli1024.com'))
    expect(client.hasPendingSupabaseSessionMigration).toBe(false)
    window.localStorage.removeItem(newKey)
    vi.resetModules()
    const reloaded = await import('./supabase')
    reloaded.getSupabaseClient()
    expect(reloaded.hasPendingSupabaseSessionMigration).toBe(false)
    expect(window.localStorage.getItem(newKey)).toBeNull()
    expect(window.localStorage.getItem(oldKey)).not.toBeNull()
  })

  it('allows SDK storage fallback when browser persistence is unavailable', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    const client = await import('./supabase')
    expect(() => client.getSupabaseClient()).not.toThrow()
    expect(mock.createClient).toHaveBeenCalledOnce()
    expect(() => client.completeSupabaseSessionMigration(token('https://supabase.ghibli1024.com'))).not.toThrow()
  })
})

it.each(['/auth/callback', '/auth/reset-password', '/login', '/'])('assigns exactly one URL exchange owner for %s', async (pathname) => {
  Object.assign(window, { location: { pathname } })
  const client = await import('./supabase')
  client.getSupabaseClient()
  expect(mock.createClient).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ auth: expect.objectContaining({ flowType: 'pkce', detectSessionInUrl: !pathname.startsWith('/auth/') }) }))
})
