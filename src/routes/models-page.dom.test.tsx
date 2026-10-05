// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、@testing-library/react、@testing-library/jest-dom、react-router-dom 的 MemoryRouter 与 ./models-page。
 * [OUTPUT]: 对外提供 ModelsPage 的真实渲染行为回归测试。
 * [POS]: routes 的模型配置页 DOM 测试，约束目录条目渲染、DeepSeek v4 默认标记、自带密钥面板承载与设置页入口。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'

import { ModelsPage } from './models-page'

vi.mock('@/lib/profile-settings', () => ({
  ProfileSettingsError: class ProfileSettingsError extends Error {
    requiresOnline = false
  },
  getUserProfile: vi.fn().mockResolvedValue(null),
  saveUserProfile: vi.fn(),
  deleteOwnAccount: vi.fn(),
}))

vi.mock('@/lib/account-data-export', () => ({
  downloadAccountDataExport: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  hasSupabaseEnv: false,
  getSupabaseClient: vi.fn(),
}))

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
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageMock })

function renderModels() {
  return render(
    <ThemeProvider>
      <LocaleProvider>
        <MemoryRouter>
          <BackgroundAudioProvider>
            <ModelsPage />
          </BackgroundAudioProvider>
        </MemoryRouter>
      </LocaleProvider>
    </ThemeProvider>,
  )
}

describe('ModelsPage', () => {
  it('renders catalog entries with the DeepSeek v4 defaults marked', () => {
    renderModels()

    expect(screen.getByTestId('models-catalog-list')).toBeVisible()
    expect(screen.getByTestId('model-catalog-deepseek-v4-flash')).toBeVisible()
    expect(screen.getByTestId('model-catalog-deepseek-flash')).toBeVisible()

    const defaults = screen.getAllByText('default')

    expect(defaults).toHaveLength(2)
  })

  it('hosts the bring-your-own-key provider panel and links to account settings', () => {
    renderModels()

    expect(screen.getByText('自带密钥')).toBeVisible()
    expect(screen.getByRole('link', { name: '账户设置' })).toHaveAttribute('href', '/settings')
  })
})
