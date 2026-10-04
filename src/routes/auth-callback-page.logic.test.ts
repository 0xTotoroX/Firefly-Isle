/**
 * [INPUT]: 依赖 vitest 的 Supabase Auth mock，依赖 ./auth-callback-page.logic 的 OAuth 回调恢复函数。
 * [OUTPUT]: 对外提供 /auth/callback code exchange、session restore 与错误回落的回归测试。
 * [POS]: routes 的 OAuth 回调逻辑测试文件，约束 Google 回调先恢复 Supabase session，再交给路由守卫进入 /app。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it, vi } from 'vitest'

import {
  getOAuthCallbackErrorMessage,
  restoreAuthCallbackSession,
  type AuthCallbackClient,
} from './auth-callback-page.logic'

function createCallbackClient(overrides: Partial<AuthCallbackClient> = {}): AuthCallbackClient {
  return {
    exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', user: { id: 'auth-user-id', email: 'synthetic@example.com' } } }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', user: { id: 'auth-user-id', email: 'synthetic@example.com' } } }, error: null }),
    ...overrides,
  }
}

describe('auth callback restore logic', () => {
  it('maps expired OAuth state errors before attempting session restore', async () => {
    const auth = createCallbackClient()

    const result = await restoreAuthCallbackSession(
      auth,
      'https://firefly.ghibli1024.com/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired',
    )

    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(auth.getSession).not.toHaveBeenCalled()
    expect(result).toEqual({
      message: 'Google 登录请求已过期，请重新使用 Google 继续。',
      status: 'error',
    })
  })

  it('exposes a friendly OAuth error message for route-level redirects', () => {
    expect(
      getOAuthCallbackErrorMessage(
        '?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired',
      ),
    ).toBe('Google 登录请求已过期，请重新使用 Google 继续。')
  })

  it('exchanges a Google OAuth code before reading the restored Supabase session', async () => {
    const auth = createCallbackClient()

    const result = await restoreAuthCallbackSession(auth, 'http://localhost:5173/auth/callback?code=oauth-code')

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code')
    expect(auth.getSession).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: 'authenticated' })
  })

  it('accepts an already-restored callback when Supabase removed the code from the URL', async () => {
    const auth = createCallbackClient()

    const result = await restoreAuthCallbackSession(auth, 'http://localhost:5173/auth/callback')

    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(auth.getSession).toHaveBeenCalledWith()
    expect(result).toMatchObject({ status: 'authenticated' })
  })

  it('maps code exchange failures to friendly retry copy', async () => {
    const auth = createCallbackClient({
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error('invalid request') }),
    })

    const result = await restoreAuthCallbackSession(auth, 'http://localhost:5173/auth/callback?code=expired')

    expect(auth.getSession).not.toHaveBeenCalled()
    expect(result).toEqual({
      message: '登录回调已失效，请重新登录。',
      status: 'error',
    })
  })

  it('returns anonymous when no Supabase session exists after callback processing', async () => {
    const auth = createCallbackClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    })

    const result = await restoreAuthCallbackSession(auth, 'http://localhost:5173/auth/callback')

    expect(result).toEqual({ status: 'anonymous' })
  })
})

it.each(['?error_code=expired', '#error=access_denied', '?code=valid#error_description=denied'])('prioritizes URL errors over a retained session: %s', async (suffix) => {
  const auth = createCallbackClient()
  expect(await restoreAuthCallbackSession(auth, `https://firefly.test/auth/reset-password${suffix}`, { requireCode: true })).toMatchObject({ status: 'error' })
  expect(auth.getSession).not.toHaveBeenCalled()
  expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
})
it('does not authorize a reset with only the old session', async () => {
  const auth = createCallbackClient()
  expect(await restoreAuthCallbackSession(auth, '/auth/reset-password', { requireCode: true })).toMatchObject({ status: 'error' })
  expect(auth.getSession).not.toHaveBeenCalled()
})
it('exchanges a code once across concurrent callback consumers', async () => {
  const auth = createCallbackClient()
  const results = await Promise.all([restoreAuthCallbackSession(auth, '/auth/callback?code=one-time'), restoreAuthCallbackSession(auth, '/auth/callback?code=one-time')])
  expect(results.every((result) => result.status === 'authenticated')).toBe(true)
  expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1)
})
it('does not reuse a retained session when a password code has expired', async () => {
  const auth = createCallbackClient({ exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: null }, error: new Error('expired') }) })
  expect(await restoreAuthCallbackSession(auth, '/auth/reset-password?code=expired', { requireCode: true })).toMatchObject({ status: 'error' })
  expect(auth.getSession).not.toHaveBeenCalled()
})
it('finishes with readable feedback after an exchange throws', async () => {
  const auth = createCallbackClient({ exchangeCodeForSession: vi.fn().mockRejectedValue(new Error('network')) })
  expect(await restoreAuthCallbackSession(auth, '/auth/callback?code=broken')).toMatchObject({ status: 'error' })
})
