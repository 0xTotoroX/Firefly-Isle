// @vitest-environment happy-dom
/**
 * [INPUT]: AuthProvider、延迟的 Supabase 认证响应与会话事件。
 * [OUTPUT]: 验证旧凭据换取期间的路由门控、失败反馈、云端兼容和退出。
 * [POS]: 认证迁移的可观察行为测试，不请求远端服务。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { Session } from '@supabase/supabase-js'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './auth'

const mock = vi.hoisted(() => ({
  initialize: vi.fn(), getSession: vi.fn(), refreshSession: vi.fn(), signOut: vi.fn(),
  unsubscribe: vi.fn(), complete: vi.fn(),
  pending: false, selfHosted: true,
  listener: null as null | ((event: string, session: Session | null) => void),
}))

vi.mock('./locale', () => ({ useLocale: () => ({ locale: 'zh' }) }))
vi.mock('./supabase', () => ({
  hasSupabaseEnv: true,
  get hasPendingSupabaseSessionMigration() { return mock.pending },
  needsSupabaseSessionRefresh: (token: string) => mock.selfHosted && token === 'legacy',
  completeSupabaseSessionMigration: (token: string) => mock.complete(token),
  getSupabaseClient: () => ({ auth: {
    initialize: mock.initialize, getSession: mock.getSession,
    refreshSession: mock.refreshSession, signOut: mock.signOut,
    onAuthStateChange: (listener: typeof mock.listener) => {
      mock.listener = listener
      return { data: { subscription: { unsubscribe: mock.unsubscribe } } }
    },
  } }),
}))

function session(accessToken: string): Session {
  return { access_token: accessToken, user: { id: 'original-owner' } } as Session
}

function Probe() {
  const auth = useAuth()
  return <>
    <output data-testid="ready">{String(auth.isAuthReady)}</output>
    <output data-testid="identity">{auth.user?.id ?? 'signed-out'}</output>
    <output data-testid="error">{auth.authError}</output>
    <button onClick={() => { void auth.signOut() }}>退出</button>
  </>
}

function mount() { return render(<AuthProvider><Probe /></AuthProvider>) }
async function ready() { await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true')) }

beforeEach(() => {
  vi.resetAllMocks()
  mock.pending = false
  mock.selfHosted = true
  mock.listener = null
  mock.initialize.mockResolvedValue({ error: null })
  mock.getSession.mockResolvedValue({ data: { session: session('legacy') }, error: null })
  mock.refreshSession.mockResolvedValue({ data: { session: session('self-hosted') }, error: null })
  mock.signOut.mockResolvedValue({ error: null })
  mock.complete.mockImplementation(() => { mock.pending = false })
})
afterEach(cleanup)

describe('AuthProvider endpoint migration', () => {
  it('keeps routes closed through early auth events until the old JWT has been exchanged', async () => {
    let resolveRefresh!: (value: unknown) => void
    mock.refreshSession.mockReturnValue(new Promise((resolve) => { resolveRefresh = resolve }))
    mock.pending = true
    mount()
    await waitFor(() => expect(mock.refreshSession).toHaveBeenCalledOnce())
    act(() => { mock.listener?.('INITIAL_SESSION', session('legacy')) })
    expect(screen.getByTestId('ready').textContent).toBe('false')
    expect(screen.getByTestId('identity').textContent).toBe('signed-out')
    await act(async () => { resolveRefresh({ data: { session: session('self-hosted') }, error: null }) })
    await ready()
    expect(screen.getByTestId('identity').textContent).toBe('original-owner')
    expect(mock.complete).toHaveBeenCalledWith('self-hosted')
  })

  it('does not refresh a normal cloud session', async () => {
    mock.selfHosted = false
    mount()
    await ready()
    expect(mock.refreshSession).not.toHaveBeenCalled()
    expect(screen.getByTestId('identity').textContent).toBe('original-owner')
  })

  it('reports a failed token exchange without completing the migration', async () => {
    mock.pending = true
    mock.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('refresh failed') })
    mount()
    await ready()
    expect(screen.getByTestId('error').textContent).not.toBe('')
    expect(screen.getByTestId('identity').textContent).toBe('signed-out')
    expect(mock.complete).not.toHaveBeenCalled()
  })

  it('reports an expired imported token rejected and removed during SDK initialization', async () => {
    mock.pending = true
    mock.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mount()
    await ready()
    expect(screen.getByTestId('error').textContent).not.toBe('')
    expect(mock.complete).not.toHaveBeenCalled()
  })

  it('rejects a refresh response that still carries a cloud-issued token', async () => {
    mock.refreshSession.mockResolvedValue({ data: { session: session('legacy') }, error: null })
    mount()
    await ready()
    expect(screen.getByTestId('identity').textContent).toBe('signed-out')
    expect(screen.getByTestId('error').textContent).not.toBe('')
    expect(mock.complete).not.toHaveBeenCalled()
  })

  it('does not mark an ordinary signed-out visitor as a migration failure', async () => {
    mock.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mount()
    await ready()
    expect(screen.getByTestId('error').textContent).toBe('')
  })

  it('blocks a later legacy SIGNED_IN event after a network failure until a refreshed session arrives', async () => {
    mock.pending = true
    mock.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('network failed') })
    mount()
    await ready()
    act(() => { mock.listener?.('SIGNED_IN', session('legacy')) })
    expect(screen.getByTestId('identity').textContent).toBe('signed-out')
    expect(screen.getByTestId('error').textContent).not.toBe('')
    expect(mock.complete).not.toHaveBeenCalled()
    act(() => { mock.listener?.('TOKEN_REFRESHED', session('self-hosted')) })
    expect(screen.getByTestId('identity').textContent).toBe('original-owner')
    expect(screen.getByTestId('error').textContent).toBe('')
    expect(mock.complete).toHaveBeenCalledWith('self-hosted')
  })

  it('marks an existing destination session complete before an explicit sign-out', async () => {
    mock.getSession.mockResolvedValue({ data: { session: session('self-hosted') }, error: null })
    mount()
    await ready()
    expect(mock.complete).toHaveBeenCalledWith('self-hosted')
    fireEvent.click(screen.getByRole('button', { name: '退出' }))
    await waitFor(() => expect(screen.getByTestId('identity').textContent).toBe('signed-out'))
  })

  it('ignores late refresh completion after the provider unmounts', async () => {
    let resolveRefresh!: (value: unknown) => void
    mock.refreshSession.mockReturnValue(new Promise((resolve) => { resolveRefresh = resolve }))
    const view = mount()
    await waitFor(() => expect(mock.refreshSession).toHaveBeenCalledOnce())
    view.unmount()
    await act(async () => { resolveRefresh({ data: { session: session('self-hosted') }, error: null }) })
    expect(mock.unsubscribe).toHaveBeenCalledOnce()
    expect(mock.complete).not.toHaveBeenCalled()
  })
})
