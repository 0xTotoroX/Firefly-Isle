/**
 * [INPUT]: 依赖 react-dom/server 静态渲染、react-router-dom MemoryRouter、vitest、BackgroundAudioProvider、LocaleProvider 与 ./lab-analytics-page。
 * [OUTPUT]: 对外提供 Demo 指标页模式提醒、Demo 内闭环导航与完整指标数据的回归测试。
 * [POS]: routes 的指标页 orchestration 测试，确保 /demo/analytics 不是匿名空态，而是带 Demo 提醒的公开全产品统计视图。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DemoSessionProvider } from '@/lib/demo-session'
import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'

import { LabAnalyticsPage } from './lab-analytics-page'

let currentTheme: 'light' | 'dark' = 'dark'
const localStorageState = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string) => localStorageState.get(key) ?? null,
  removeItem: (key: string) => {
    localStorageState.delete(key)
  },
  setItem: (key: string, value: string) => {
    localStorageState.set(key, value)
  },
}

vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('window', { localStorage: localStorageMock })

beforeEach(() => {
  currentTheme = 'dark'
  localStorageState.clear()
})

vi.mock('@/lib/theme', async () => {
  const actual = await vi.importActual<typeof import('@/lib/theme')>('@/lib/theme')

  return {
    ...actual,
    useTheme: () => ({
      accent: '#E85D2A',
      setAccent: vi.fn(),
      theme: currentTheme,
      toggleTheme: vi.fn(),
    }),
  }
})

function renderDemoAnalytics() {
  return renderToStaticMarkup(
    <LocaleProvider>
      <BackgroundAudioProvider>
        <MemoryRouter initialEntries={['/demo/analytics/demo-relapsed']}>
          <DemoSessionProvider><Routes>
            <Route path="/demo/analytics/:id" element={<LabAnalyticsPage userIsAnonymous userLabel="DEMO_MODE" />} />
          </Routes></DemoSessionProvider>
        </MemoryRouter>
      </BackgroundAudioProvider>
    </LocaleProvider>,
  )
}

describe('LabAnalyticsPage Demo route', () => {
  it('renders the public Demo analytics page with a mode reminder and full lab data', () => {
    const markup = renderDemoAnalytics()

    expect(markup).toContain('data-testid="demo-mode-banner"')
    expect(markup).toContain('演示模式')
    expect(markup).toContain('虚构资料')
    expect(markup).toContain('href="/demo/record/demo-relapsed"')
    expect(markup).toContain('href="/demo/analytics/demo-relapsed"')
    expect(markup).toContain('血常规')
    expect(markup).toContain('血生化')
    expect(markup).toContain('肿瘤标志物')
    expect(markup).toContain('癌胚抗原')
  })
})
