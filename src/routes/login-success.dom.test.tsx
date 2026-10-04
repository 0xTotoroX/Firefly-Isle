/** @vitest-environment happy-dom */
/**
 * [INPUT]: 真实 LoginPage/AuthCallbackPage 与 MemoryRouter，展示层和 Auth SDK mock。
 * [OUTPUT]: 验证本次认证成功离开错误/重置入口，等待确认与旧会话不绕过回调错误。
 * [POS]: routes 的登录恢复集成回归，覆盖路由替换与认证动作结果的接线。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { LoginPageViewProps } from '@/components/login-page-view'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(), getSession: vi.fn(), resetPasswordForEmail: vi.fn(),
  signInWithPassword: vi.fn(), signInAnonymously: vi.fn(), signUp: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ hasSupabaseEnv: true, getSupabaseClient: () => ({ auth }) }))
vi.mock('@/lib/locale', () => ({ useLocale: () => ({ locale: 'zh' }) }))
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }))
vi.mock('@/components/login-page-view', () => ({
  LoginPageView: (props: LoginPageViewProps) => <>
    {props.authError ? <p role="alert">{props.authError}</p> : null}
    {props.feedback ? <p role="status">{props.feedback.message}</p> : null}
    <p data-testid="mode">{props.mode}</p>
    <form onSubmit={props.onSubmit}>
      <input aria-label="邮箱" onChange={(event) => props.onEmailChange(event.target.value)} value={props.email} />
      <input aria-label="密码" onChange={(event) => props.onPasswordChange(event.target.value)} value={props.password} />
      <button disabled={props.isSubmitting} type="submit">提交</button>
    </form>
    <button onClick={() => props.onModeChange('login')}>切回登录</button>
    <button onClick={() => props.onModeChange('sign-up')}>注册</button>
    <button onClick={props.onAnonymousLogin}>匿名进入</button>
  </>,
}))
import { AuthCallbackPage } from './auth-callback-page'
import { LoginPage } from './login-page'

function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output data-testid="location">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>后退</button></>
}
function mount(path: string) {
  window.history.replaceState(null, '', path)
  return render(<MemoryRouter initialEntries={['/previous', path]} initialIndex={1}>
    <LocationProbe />
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<p>总览页面</p>} />
      <Route path="/previous" element={<p>上一个页面</p>} />
    </Routes>
  </MemoryRouter>)
}
function fillCredentials() {
  fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'synthetic@example.com' } })
  fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'synthetic-password' } })
}
beforeEach(() => {
  vi.resetAllMocks()
  const session = { user: { id: 'retained-owner', email: 'old@example.com' } }
  auth.getSession.mockResolvedValue({ data: { session }, error: null })
  auth.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: new Error('expired') })
  auth.signInWithPassword.mockResolvedValue({ error: null })
  auth.signInAnonymously.mockResolvedValue({ error: null })
  auth.resetPasswordForEmail.mockResolvedValue({ error: null })
  auth.signUp.mockResolvedValue({ data: { user: { id: 'pending-owner' }, session: null }, error: null })
})

describe('explicit authentication success navigation', () => {
  it.each(['/auth/callback?error=access_denied', '/auth/callback?code=expired-code'])('replaces %s after successful email login', async (path) => {
    mount(path)
    await screen.findByRole('alert')
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await screen.findByText('总览页面')
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'synthetic@example.com', password: 'synthetic-password' })
    expect(screen.getByTestId('location').textContent).toBe('/dashboard')
    fireEvent.click(screen.getByRole('button', { name: '后退' }))
    await screen.findByText('上一个页面')
  })
  it('leaves the password-reset query after requesting mail and switching back to login', async () => {
    mount('/login?mode=password-reset')
    expect(screen.getByTestId('mode').textContent).toBe('password-reset')
    fillCredentials()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '提交' })))
    expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('location').textContent).toBe('/login?mode=password-reset')
    fireEvent.click(screen.getByRole('button', { name: '切回登录' }))
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await screen.findByText('总览页面')
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1)
  })
  it('leaves a failed callback after this anonymous sign-in succeeds', async () => {
    mount('/auth/callback?error=access_denied')
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: '匿名进入' }))
    await screen.findByText('总览页面')
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1)
  })
  it('keeps pending signup on the login surface, clears the password and shows confirmation guidance', async () => {
    mount('/auth/callback?error=access_denied')
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: '注册' }))
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await screen.findByText('注册请求已提交，请查收确认邮件后登录。')
    expect(screen.queryByText('总览页面')).toBeNull()
    expect(screen.getByTestId('mode').textContent).toBe('login')
    expect((screen.getByLabelText('密码') as HTMLInputElement).value).toBe('')
  })
  it('enters Dashboard when signup returns its own active session', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'new-owner' }, session: { user: { id: 'new-owner' } } }, error: null })
    mount('/auth/callback?error=access_denied')
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: '注册' }))
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await screen.findByText('总览页面')
  })
  it('keeps initial callback errors visible despite a retained session and failed login attempts', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: new Error('wrong password') })
    mount('/auth/callback?error=access_denied')
    await screen.findByText('登录回调已失效，请重新登录。')
    expect(auth.getSession).not.toHaveBeenCalled()
    expect(screen.queryByText('总览页面')).toBeNull()
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await screen.findByText('邮箱或密码错误，请重新确认后再试。')
    expect(screen.getByTestId('location').textContent).toBe('/auth/callback?error=access_denied')
    expect(screen.queryByText('总览页面')).toBeNull()
  })
})
