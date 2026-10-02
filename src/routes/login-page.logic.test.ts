/**
 * [INPUT]: 依赖 vitest 的 Supabase auth mock，依赖 ./login-page.logic 的认证动作函数。
 * [OUTPUT]: 对外提供登录、注册、重置密码、匿名登录与 Google OAuth 的行为回归测试。
 * [POS]: routes 的登录逻辑测试文件，约束 /login 容器调用 Supabase Auth 时的参数、反馈文案、模式跳转与 Google OAuth 分支。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { describe, expect, it, vi } from 'vitest'

import {
  startAnonymousAuth,
  startGoogleAuth,
  submitEmailAuth,
  type LoginAuthClient,
} from './login-page.logic'

function createAuthClient(overrides: Partial<LoginAuthClient> = {}): LoginAuthClient {
  return {
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    signInAnonymously: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    ...overrides,
  }
}

describe('login page auth logic', () => {
  it('submits email/password login and returns workspace-entry feedback on success', async () => {
    const auth = createAuthClient()

    const result = await submitEmailAuth({
      auth,
      email: 'doctor@example.com',
      mode: 'login',
      password: 'clinical-key',
    })

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'doctor@example.com',
      password: 'clinical-key',
    })
    expect(result).toEqual({
      authenticated: true,
      feedback: { message: '认证成功，正在进入工作区。', tone: 'neutral' },
    })
  })

  it('maps email/password login errors to a credential-specific feedback message', async () => {
    const auth = createAuthClient({
      signInWithPassword: vi.fn().mockResolvedValue({ error: new Error('invalid credentials') }),
    })

    const result = await submitEmailAuth({
      auth,
      email: 'doctor@example.com',
      mode: 'login',
      password: 'wrong-key',
    })

    expect(result.feedback).toEqual({
      message: '邮箱或密码错误，请重新确认后再试。',
      tone: 'error',
    })
  })

  it('reports incomplete signup responses without asking to disable email confirmation', async () => {
    const auth = createAuthClient({
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    })

    const result = await submitEmailAuth({
      auth,
      email: 'new-doctor@example.com',
      mode: 'sign-up',
      password: 'clinical-key',
    })

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'new-doctor@example.com',
      password: 'clinical-key',
    })
    expect(result).toEqual({
      feedback: { message: '暂时无法完成注册，请稍后再试。', tone: 'error' },
    })
  })

  it('creates the account and enters the workspace when signup returns an active session', async () => {
    const auth = createAuthClient({
      signUp: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null }),
    })

    const result = await submitEmailAuth({
      auth,
      email: 'new-doctor@example.com',
      mode: 'sign-up',
      password: 'clinical-key',
    })

    expect(result).toEqual({
      authenticated: true,
      clearPassword: true,
      feedback: { message: '注册成功，正在进入工作区。', tone: 'neutral' },
    })
  })

  it('requests password reset with an explicit redirect URL and no password payload', async () => {
    const auth = createAuthClient()

    const result = await submitEmailAuth({
      auth,
      email: 'doctor@example.com',
      mode: 'password-reset',
      password: '',
      passwordResetRedirectTo: 'http://localhost:5173/login',
    })

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('doctor@example.com', {
      redirectTo: 'http://localhost:5173/login',
    })
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
    expect(result).toEqual({
      feedback: { message: '如果该邮箱已注册，我们会发送重置邮件。', tone: 'success' },
      nextMode: 'login',
    })
  })

  it('returns neutral account-existence feedback only when password reset mail is accepted', async () => {
    const auth = createAuthClient({
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: new Error('smtp unavailable') }),
    })

    const result = await submitEmailAuth({
      auth,
      email: 'doctor@example.com',
      mode: 'password-reset',
      password: '',
      passwordResetRedirectTo: 'http://localhost:5173/login',
    })

    expect(result).toEqual({
      feedback: { message: '暂时无法发送重置邮件，请稍后再试。', tone: 'error' },
    })
  })

  it('starts an anonymous session through Supabase Auth', async () => {
    const auth = createAuthClient()

    const result = await startAnonymousAuth(auth)

    expect(auth.signInAnonymously).toHaveBeenCalledWith()
    expect(result).toEqual({
      authenticated: true,
      feedback: { message: '匿名会话已建立，正在进入工作区。', tone: 'neutral' },
    })
  })

  it('maps anonymous auth errors without falling back to local-only state', async () => {
    const auth = createAuthClient({
      signInAnonymously: vi.fn().mockResolvedValue({ error: new Error('anonymous disabled') }),
    })

    const result = await startAnonymousAuth(auth)

    expect(result).toEqual({
      feedback: { message: '匿名入口暂时不可用，请稍后再试。', tone: 'error' },
    })
  })

  it('starts Google OAuth with the public callback URL and account chooser prompt', async () => {
    const auth = createAuthClient()

    const result = await startGoogleAuth(auth, 'http://localhost:5173/auth/callback')

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      options: {
        queryParams: { prompt: 'select_account' },
        redirectTo: 'http://localhost:5173/auth/callback',
      },
      provider: 'google',
    })
    expect(result).toEqual({
      feedback: { message: '正在前往 Google 登录。', tone: 'neutral' },
    })
  })

})

it('accepts a user awaiting email confirmation and uses the public confirmation route', async () => {
  const auth = createAuthClient({ signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'pending-user' }, session: null }, error: null }) })
  const result = await submitEmailAuth({ auth, email: 'pending@example.com', password: 'secret-password', mode: 'sign-up', signUpRedirectTo: 'https://firefly.test/auth/callback' })
  expect(result).toEqual({ clearPassword: true, feedback: { message: '注册请求已提交，请查收确认邮件后登录。', tone: 'success' }, nextMode: 'login' })
  expect(auth.signUp).toHaveBeenCalledWith({ email: 'pending@example.com', password: 'secret-password', options: { emailRedirectTo: 'https://firefly.test/auth/callback' } })
})
