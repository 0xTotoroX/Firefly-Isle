/** @vitest-environment happy-dom */
/**
 * [INPUT]: StrictMode、React 测试库、Router、回调/重置页及 Auth mock。
 * [OUTPUT]: 回调错误与终态、恢复凭据和重置表单的 DOM 回归。
 * [POS]: 公开认证路由生命周期测试，只使用合成凭据和 mock 服务。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  auth: { exchangeCodeForSession: vi.fn(), getSession: vi.fn(), updateUser: vi.fn() },
  updateRecoveredPassword: vi.fn(),
  user: { id: 'reset-owner', email: 'synthetic@example.com' },
}))
vi.mock('@/lib/locale', () => ({ useLocale: () => ({ locale: 'zh' }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: mock.user, isAuthenticated: true }) }))
vi.mock('@/lib/password-recovery', () => ({ updateRecoveredPassword: mock.updateRecoveredPassword }))
vi.mock('@/lib/supabase', () => ({ hasSupabaseEnv: true, getSupabaseClient: () => ({ auth: mock.auth }) }))
vi.mock('./login-page', () => ({ LoginPage: ({ authError }: { authError?: string }) => <div role="alert">{authError || '登录入口'}</div> }))
import { AuthCallbackPage } from './auth-callback-page'
import { ResetPasswordPage } from './reset-password-page'

let nextCode = 0
function mount(path: string) {
  return render(<StrictMode><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
    <Route path="/dashboard" element={<p>总览页面</p>} />
    <Route path="/login" element={<p>登录入口</p>} />
  </Routes></MemoryRouter></StrictMode>)
}
const validUrl = () => `/auth/reset-password?code=test-${++nextCode}`
function fillPassword(password = 'new-secret', confirmation = password) {
  fireEvent.change(screen.getByLabelText('新密码'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: confirmation } })
  fireEvent.click(screen.getByRole('button', { name: '保存新密码' }))
}
beforeEach(() => {
  vi.clearAllMocks()
  mock.user = { id: 'reset-owner', email: 'synthetic@example.com' }
  mock.auth.exchangeCodeForSession.mockResolvedValue({ data: { session: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', user: mock.user } }, error: null })
  mock.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', user: mock.user } }, error: null })
  mock.updateRecoveredPassword.mockResolvedValue({ data: { user: mock.user }, error: null })
})

describe('callback terminal states', () => {
  it('shows query and fragment errors despite an existing login', async () => {
    mount('/auth/callback?code=unused#error_code=expired')
    expect((await screen.findByRole('alert')).textContent).toBe('登录回调已失效，请重新登录。')
    expect(screen.queryByText('总览页面')).toBeNull()
    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
  it('shows an exchange error instead of loading forever or accepting the old session', async () => {
    mock.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('invalid verifier') })
    mount(`/auth/callback?code=bad-${++nextCode}`)
    await screen.findByText('登录回调已失效，请重新登录。')
    expect(screen.queryByText('正在恢复登录状态')).toBeNull()
    expect(mock.auth.getSession).not.toHaveBeenCalled()
  })
  it('survives StrictMode without consuming the same code twice and enters dashboard', async () => {
    mount(`/auth/callback?code=normal-${++nextCode}`)
    await screen.findByText('总览页面')
    expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1)
  })
})

describe('reset password page', () => {
  it.each(['/auth/reset-password', '/auth/reset-password#error=denied', '/auth/reset-password?error_description=expired'])('rejects %s despite a retained authenticated session', async (path) => {
    mount(path)
    await screen.findByText('重置链接无效或已过期，请重新请求重置邮件。')
    expect(screen.queryByLabelText('新密码')).toBeNull()
    expect(mock.updateRecoveredPassword).not.toHaveBeenCalled()
    expect(mock.auth.getSession).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: '重新请求重置邮件' }).getAttribute('href')).toBe('/login?mode=password-reset')
  })
  it('waits for a valid exchange before accepting password input', async () => {
    let resolve!: (value: unknown) => void
    mock.auth.exchangeCodeForSession.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    mount(validUrl())
    expect(screen.queryByLabelText('新密码')).toBeNull()
    await waitFor(() => expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1))
    await act(async () => resolve({ data: { session: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', user: mock.user } }, error: null }))
    await screen.findByLabelText('新密码')
    expect(screen.getByText('当前邮箱：synthetic@example.com')).toBeTruthy()
    fillPassword()
    await screen.findByText('密码已更新。')
    expect(mock.updateRecoveredPassword).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', user: mock.user }), 'new-secret')
    expect(screen.queryByLabelText('新密码')).toBeNull()
  })
  it('keeps the form for mismatched passwords and failed submissions, then retries', async () => {
    mock.updateRecoveredPassword.mockResolvedValueOnce({ error: new Error('service unavailable') })
    mount(validUrl())
    await screen.findByLabelText('新密码')
    fillPassword('new-secret', 'different-secret')
    await screen.findByText('两次输入的密码不一致。')
    expect(mock.updateRecoveredPassword).not.toHaveBeenCalled()
    fillPassword()
    await screen.findByText('未能更新密码，请重试；链接过期时请重新请求邮件。')
    expect((screen.getByLabelText('新密码') as HTMLInputElement).value).toBe('new-secret')
    fireEvent.click(screen.getByRole('button', { name: '保存新密码' }))
    await screen.findByText('密码已更新。')
    expect(mock.updateRecoveredPassword).toHaveBeenCalledTimes(2)
    expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1)
  })
  it('rechecks ownership before updateUser if another account replaced the session', async () => {
    mount(validUrl())
    await screen.findByLabelText('新密码')
    mock.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'another-owner' } } }, error: null })
    fillPassword()
    await screen.findByText('重置链接无效或已过期，请重新请求重置邮件。')
    expect(mock.updateRecoveredPassword).not.toHaveBeenCalled()
  })
})
