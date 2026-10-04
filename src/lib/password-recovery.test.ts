/** @vitest-environment happy-dom */
/**
 * [INPUT]: updateRecoveredPassword、恢复凭据快照及延迟 Auth mock。
 * [OUTPUT]: 切账号后改密仍绑定恢复 owner、身份不匹配与凭据缺失拒绝的回归。
 * [POS]: 恢复身份隔离测试，不向真实 Auth 服务修改密码。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { updateRecoveredPassword } from './password-recovery'

vi.mock('@/lib/supabase', () => ({ supabaseEnv: { supabaseUrl: 'https://auth.example.test', supabaseAnonKey: 'synthetic-public-key' } }))
const globalKey = 'sb-shared-auth-token'
function token(owner: string) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 })}.c3ludGhldGlj`
}
const recovery = () => ({ access_token: token('owner-a'), refresh_token: 'synthetic-refresh-a', user: { id: 'owner-a' } })
const userResponse = (id: string) => new Response(JSON.stringify({ id, email: `${id}@example.test` }), { status: 200, headers: { 'Content-Type': 'application/json' } })
let sender: ReturnType<typeof vi.fn>
beforeEach(() => {
  sender = vi.fn()
  vi.stubGlobal('fetch', sender)
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
    clear: () => values.clear(),
    get length() { return values.size },
  })
})
afterEach(() => { vi.unstubAllGlobals() })

describe('password recovery credential isolation', () => {
  it('keeps PUT bound to the recovery owner when shared storage switches account during the SDK request', async () => {
    let resolveIdentity!: (value: Response) => void
    let identityStarted!: () => void
    const started = new Promise<void>((done) => { identityStarted = done })
    sender.mockImplementationOnce(() => { identityStarted(); return new Promise<Response>((done) => { resolveIdentity = done }) }).mockImplementationOnce(() => userResponse('owner-a'))
    const credentials = recovery()
    window.localStorage.setItem(globalKey, JSON.stringify(credentials))
    const pending = updateRecoveredPassword(credentials, 'new-synthetic-password')
    await started
    const nextAccount = JSON.stringify({ access_token: token('owner-b'), refresh_token: 'synthetic-refresh-b', user: { id: 'owner-b' } })
    window.localStorage.setItem(globalKey, nextAccount)
    resolveIdentity(userResponse('owner-a'))
    expect(await pending).toEqual(expect.objectContaining({ error: null }))
    expect(sender).toHaveBeenCalledTimes(2)
    const put = sender.mock.calls.find(([, options]) => options.method === 'PUT')!
    expect(put[0]).toBe('https://auth.example.test/auth/v1/user')
    expect(put[1].headers.Authorization).toBe(`Bearer ${credentials.access_token}`)
    expect(JSON.parse(put[1].body)).toMatchObject({ password: 'new-synthetic-password' })
    expect(window.localStorage.getItem(globalKey)).toBe(nextAccount)
    expect(window.localStorage.length).toBe(1)
  })

  it('refuses a restored identity that differs from the recovery proof', async () => {
    sender.mockImplementationOnce(() => userResponse('owner-b'))
    expect((await updateRecoveredPassword(recovery(), 'new-synthetic-password')).error).toBeTruthy()
    expect(sender).toHaveBeenCalledTimes(1)
    expect(sender.mock.calls[0][1].method).toBe('GET')
  })

  it('does not fall back to shared storage when recovery credentials are missing', async () => {
    window.localStorage.setItem(globalKey, JSON.stringify(recovery()))
    expect((await updateRecoveredPassword({ user: { id: 'owner-a' } }, 'new-synthetic-password')).error).toBeTruthy()
    expect(sender).not.toHaveBeenCalled()
  })
})
