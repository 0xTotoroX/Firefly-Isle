// @vitest-environment happy-dom
/**
 * [INPUT]: 真实 App/BrowserRouter、合成登录状态与页面探针。
 * [OUTPUT]: 验证 Router 7 的账户守卫、患者参数、公开分享与认证回调。
 * [POS]: 路由升级行为回归；不连接账户、模型或真实病历。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'

const account = vi.hoisted(() => ({ signedIn: false }))
vi.mock('@/lib/auth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ isAuthenticated: account.signedIn, isAuthReady: true, isSigningOut: false, authError: null, signOut: vi.fn(), user: account.signedIn ? { id: 'synthetic-owner', email: 'owner@example.test' } : null }),
}))
vi.mock('@/components/privacy-gate', () => ({ PrivacyGate: ({ children }: { children: ReactNode }) => children }))
vi.mock('@/routes/login-page', () => ({ LoginPage: () => <p>Login probe</p> }))
vi.mock('@/routes/dashboard-page', () => ({ DashboardPage: () => <Link to="/record/synthetic-patient">Open patient</Link> }))
vi.mock('@/routes/record-page', () => ({ RecordPage: () => <PatientProbe /> }))
vi.mock('@/routes/lab-analytics-page', () => ({ LabAnalyticsPage: () => <p>Analytics {useParams().id}</p> }))
vi.mock('@/routes/shared-record-page', () => ({ SharedRecordPage: () => <p>Shared {useParams().code}</p> }))
vi.mock('@/routes/auth-callback-page', () => ({ AuthCallbackPage: () => <p>Callback probe</p> }))

function PatientProbe() {
  const { id } = useParams()
  return <><p>Patient {id}</p><Link to={`/analytics/${id}`}>Open analytics</Link></>
}

function open(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

beforeEach(() => { account.signedIn = false })
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/') })

describe('Router 7 application boundaries', () => {
  it('redirects a signed-out patient route to login', async () => {
    open('/record/synthetic-patient')
    await screen.findByText('Login probe')
    expect(window.location.pathname).toBe('/login')
  })

  it('keeps the authenticated landing and patient-scoped links connected', async () => {
    account.signedIn = true
    open('/')
    await userEvent.click(await screen.findByText('Open patient'))
    await screen.findByText('Patient synthetic-patient')
    expect(window.location.pathname).toBe('/record/synthetic-patient')
    await userEvent.click(screen.getByText('Open analytics'))
    await screen.findByText('Analytics synthetic-patient')
    expect(window.location.pathname).toBe('/analytics/synthetic-patient')
  })

  it('keeps capability sharing public without an account', async () => {
    open('/share/synthetic-code')
    await screen.findByText('Shared synthetic-code')
    expect(window.location.pathname).toBe('/share/synthetic-code')
  })

  it('keeps authentication callback reachable while signed out', async () => {
    open('/auth/callback')
    await waitFor(() => expect(screen.getByText('Callback probe')).toBeTruthy())
    expect(window.location.pathname).toBe('/auth/callback')
  })
})
