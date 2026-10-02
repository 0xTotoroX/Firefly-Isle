/** @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { getSupabaseClient } from '@/lib/supabase'

vi.mock('@/lib/supabase', async (original) => ({
  ...await original<typeof import('@/lib/supabase')>(),
  getSupabaseClient: vi.fn(() => { throw new Error('Demo must not create a real client') }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) }, clear: () => values.clear(), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size } }
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  vi.stubGlobal('localStorage', storage)
  window.localStorage.setItem('firefly-theme', 'light')
  window.localStorage.setItem('firefly-locale', 'en')
  window.localStorage.setItem('firefly-custom-symptoms', '["REAL_PRIVATE_SYMPTOM"]')
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Unexpected network request'))))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function openDemo(path: string) {
  window.history.replaceState({}, '', path)
  return render(<App />)
}

describe('public demo isolation', () => {
  it.each(['/record/demo', '/analytics/demo', '/demo/dashboard', '/demo/app', '/demo/app?patient=demo-early', '/demo/record/demo-early', '/demo/analytics/demo-initial', '/demo/record/demo-relapsed/side-effects', '/demo/record/demo-relapsed/follow-up', '/demo/settings', '/demo/models'])(
    'renders %s without initializing Supabase or touching saved preferences', async (path) => {
      openDemo(path)
      await screen.findByTestId('demo-mode-banner')
      expect(getSupabaseClient).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
      expect(window.localStorage.getItem('firefly-theme')).toBe('light')
      expect(window.localStorage.getItem('firefly-locale')).toBe('en')
      expect(screen.queryByText('REAL_PRIVATE_SYMPTOM')).toBeNull()
      const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
      expect(links.filter((link) => link.getAttribute('href')?.startsWith('/') && !link.getAttribute('href')?.startsWith('/demo')).map((link) => link.getAttribute('href'))).toEqual(['/login'])
    },
  )

  it('saves a display name across client navigation and resets it without real API calls', async () => {
    openDemo('/demo/settings')
    const name = await screen.findByTestId('settings-display-name-input')
    await waitFor(() => expect((name as HTMLInputElement).value).toBe('演示账号'))
    fireEvent.change(name, { target: { value: '本次演示名称' } })
    fireEvent.click(screen.getByTestId('settings-save-button'))
    await screen.findByText('设置已保存')
    fireEvent.click(screen.getByRole('link', { name: '总览' }))
    await screen.findByRole('heading', { name: '我的病历' })
    fireEvent.click(screen.getByRole('link', { name: '设置' }))
    await waitFor(() => expect((screen.getByTestId('settings-display-name-input') as HTMLInputElement).value).toBe('本次演示名称'))
    fireEvent.click(screen.getByRole('button', { name: '重置演示' }))
    await waitFor(() => expect((screen.getByTestId('settings-display-name-input') as HTMLInputElement).value).toBe('演示账号'))
    expect(getSupabaseClient).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps a newly created patient through empty analytics and its upload link', async () => {
    openDemo('/demo/app')
    fireEvent.click(await screen.findByRole('button', { name: '填入虚构示例' }))
    fireEvent.click(screen.getByRole('button', { name: /开始结构化提取/ }))
    const patientLink = await screen.findByRole('link', { name: '示例患者丁' })
    const recordHref = patientLink.getAttribute('href')!
    expect(recordHref).toMatch(/^\/demo\/record\/demo-patient-/)
    fireEvent.click(screen.getByRole('link', { name: '统计' }))
    const uploadLink = await screen.findByRole('link', { name: '上传化验报告' })
    fireEvent.click(uploadLink)
    await waitFor(() => expect(screen.getByRole('link', { name: '示例患者丁' }).getAttribute('href')).toBe(recordHref))
    expect(getSupabaseClient).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps custom symptom vocabulary inside the demo session', async () => {
    openDemo('/demo/record/demo-early/side-effects')
    const symptom = await screen.findByTestId('side-effect-symptom-input')
    fireEvent.change(symptom, { target: { value: '仅在演示中的症状' } })
    fireEvent.change(screen.getByTestId('side-effect-date-input'), { target: { value: '2026-10-02' } })
    fireEvent.click(screen.getByTestId('side-effect-save-button'))
    await waitFor(() => expect(screen.getAllByText('仅在演示中的症状').length).toBeGreaterThan(0))
    expect(window.localStorage.getItem('firefly-custom-symptoms')).toBe('["REAL_PRIVATE_SYMPTOM"]')
    expect(getSupabaseClient).not.toHaveBeenCalled()
  })

  it('shows an unavailable state for an unknown patient rather than another fixture', async () => {
    openDemo('/demo/record/unknown')
    expect(await screen.findByRole('heading', { name: '没有找到这份演示病历' })).toBeTruthy()
    expect(screen.queryByText('示例患者丙')).toBeNull()
    expect(getSupabaseClient).not.toHaveBeenCalled()
  })
})
