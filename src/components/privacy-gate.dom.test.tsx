// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、@testing-library/react、@testing-library/user-event、@testing-library/jest-dom、@/lib/privacy 的存储 key、react-router-dom 的 MemoryRouter 与 ./privacy-gate。
 * [OUTPUT]: 对外提供 PrivacyGate 阻塞与放行行为的真实渲染回归测试。
 * [POS]: components 的隐私门控 DOM 测试，验证未同意时渲染遮罩、同意动作持久化到 localStorage、隐私页路径绕过门控。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { copy, getCopy } from '@/lib/copy'
import { LocaleProvider } from '@/lib/locale'
import { PRIVACY_ACCEPTED_STORAGE_KEY } from '@/lib/privacy'

import { PrivacyGate } from './privacy-gate'

const localStorageState = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string) => localStorageState.get(key) ?? null,
  removeItem: (key: string) => {
    localStorageState.delete(key)
  },
  setItem: (key: string, value: string) => {
    localStorageState.set(key, value)
  },
  clear: () => {
    localStorageState.clear()
  },
}

vi.stubGlobal('localStorage', localStorageMock)
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageMock })

vi.mock('@/lib/theme', async () => {
  const actual = await vi.importActual<typeof import('@/lib/theme')>('@/lib/theme')

  return {
    ...actual,
    useTheme: () => ({
      theme: 'dark',
      toggleTheme: vi.fn(),
    }),
  }
})

function renderGate(initialPath = '/app') {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="*"
            element={
              <PrivacyGate>
                <p data-testid="app-content">workspace</p>
              </PrivacyGate>
            }
          />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('PrivacyGate', () => {
  it('blocks first visit with the consent overlay while keeping children mounted', () => {
    renderGate()

    expect(screen.getByTestId('app-content')).toBeVisible()
    expect(screen.getByRole('button', { name: getCopy(copy.privacyGate.darkAccept, 'zh') })).toBeVisible()
  })

  it('persists consent to localStorage and removes the overlay on accept', async () => {
    renderGate()

    await userEvent.click(screen.getByRole('button', { name: '我已了解并继续' }))

    expect(localStorage.getItem(PRIVACY_ACCEPTED_STORAGE_KEY)).toBe('true')
    expect(screen.queryByRole('button', { name: getCopy(copy.privacyGate.darkAccept, 'zh') })).not.toBeInTheDocument()
  })

  it('bypasses the gate on the standalone privacy page', () => {
    renderGate('/privacy')

    expect(screen.queryByRole('button', { name: getCopy(copy.privacyGate.darkAccept, 'zh') })).not.toBeInTheDocument()
  })

  it('keeps the visitor blocked when they choose to stay', async () => {
    renderGate()

    await userEvent.click(screen.getByRole('button', { name: getCopy(copy.privacyGate.darkDecline, 'zh') }))

    expect(localStorage.getItem(PRIVACY_ACCEPTED_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('button', { name: getCopy(copy.privacyGate.darkAccept, 'zh') })).toBeVisible()
  })
})
