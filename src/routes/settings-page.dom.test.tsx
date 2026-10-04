// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、@testing-library/react、@testing-library/user-event、@testing-library/jest-dom、vitest 模块 mock 与 ./settings-page。
 * [OUTPUT]: 对外提供 SettingsPage 的真实渲染行为回归测试。
 * [POS]: routes 的账户设置 DOM 测试，验证账户身份展示、显示名称保存链路、语言/主题偏好即时应用与档案写入、档案服务缺失时的降级提示。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import '@testing-library/jest-dom/vitest'

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BackgroundAudioProvider } from '@/lib/background-audio'

import { SettingsPage } from './settings-page'

const downloadExport = vi.fn()

vi.mock('@/lib/account-data-export', () => ({
  downloadAccountDataExport: (...args: unknown[]) => downloadExport(...args),
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

const setLocale = vi.fn()
const setTheme = vi.fn()
const identity = vi.hoisted(() => ({ user: { id: 'user-1', email: 'rider@firefly.test', is_anonymous: false } }))

vi.mock('@/lib/auth', async () => ({
  useOptionalAuth: () => ({
    user: identity.user,
  }),
}))

vi.mock('@/lib/locale', async () => {
  const actual = await vi.importActual<typeof import('@/lib/locale')>('@/lib/locale')

  return {
    ...actual,
    useLocale: () => ({
      locale: 'zh',
      setLocale,
      toggleLocale: vi.fn(),
    }),
  }
})

vi.mock('@/lib/theme', async () => {
  const actual = await vi.importActual<typeof import('@/lib/theme')>('@/lib/theme')

  return {
    ...actual,
    useTheme: () => ({
      accent: '#E85D2A',
      setAccent: vi.fn(),
      theme: 'dark',
      setTheme,
      toggleTheme: vi.fn(),
    }),
  }
})

const getUserProfile = vi.fn()
const saveUserProfile = vi.fn()
const deleteOwnAccount = vi.fn()

vi.mock('@/lib/profile-settings', () => ({
  ProfileSettingsError: class ProfileSettingsError extends Error {
    requiresOnline = false
  },
  getUserProfile: (...args: unknown[]) => getUserProfile(...args),
  saveUserProfile: (...args: unknown[]) => saveUserProfile(...args),
  deleteOwnAccount: (...args: unknown[]) => deleteOwnAccount(...args),
}))

function renderSettings() {
  return render(
    <MemoryRouter>
      <BackgroundAudioProvider>
        <SettingsPage />
      </BackgroundAudioProvider>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => { identity.user = { id: 'user-1', email: 'rider@firefly.test', is_anonymous: false } })

  it('preserves a draft across rerenders and clears the previous account name on account change', async () => {
    let resolveProfile!: (profile: { displayName: string; locale: string; theme: string }) => void
    getUserProfile.mockResolvedValueOnce({ displayName: 'First', locale: 'zh', theme: 'dark' })
      .mockReturnValueOnce(new Promise((resolve) => { resolveProfile = resolve }))
    const view = renderSettings()
    const name = await screen.findByDisplayValue('First')
    await userEvent.clear(name)
    await userEvent.type(name, 'Draft')
    const page = () => <MemoryRouter><BackgroundAudioProvider><SettingsPage /></BackgroundAudioProvider></MemoryRouter>
    view.rerender(page())
    expect(screen.getByDisplayValue('Draft')).toBeInTheDocument()
    identity.user = { id: 'user-2', email: 'second@firefly.test', is_anonymous: false }
    view.rerender(page())
    expect(screen.queryByDisplayValue('Draft')).not.toBeInTheDocument()
    await act(async () => { resolveProfile({ displayName: 'Second', locale: 'zh', theme: 'dark' }) })
    expect(screen.getByDisplayValue('Second')).toBeInTheDocument()
  })

  it('shows the account email from the session truth source', () => {
    getUserProfile.mockResolvedValue(null)
    renderSettings()

    expect(screen.getByText('rider@firefly.test')).toBeVisible()
  })

  it('saves the display name together with current locale and theme', async () => {
    getUserProfile.mockResolvedValue(null)
    saveUserProfile.mockResolvedValue({ displayName: '萤', locale: 'zh', theme: 'dark' })
    renderSettings()

    await userEvent.type(await screen.findByTestId('settings-display-name-input'), '萤')
    await userEvent.click(screen.getByTestId('settings-save-button'))

    await waitFor(() => {
      expect(saveUserProfile).toHaveBeenCalledWith({ displayName: '萤', locale: 'zh', theme: 'dark' })
    })
    expect(await screen.findByText('设置已保存')).toBeVisible()
  })

  it('applies locale and theme preferences immediately and persists them', async () => {
    getUserProfile.mockResolvedValue({ displayName: null, locale: 'zh', theme: 'dark' })
    renderSettings()

    await userEvent.click(await screen.findByTestId('settings-locale-en'))
    await userEvent.click(screen.getByTestId('settings-theme-light'))

    expect(setLocale).toHaveBeenCalledWith('en')
    expect(setTheme).toHaveBeenCalledWith('light')
    await waitFor(() => {
      expect(saveUserProfile).toHaveBeenCalledWith({ locale: 'en' })
      expect(saveUserProfile).toHaveBeenCalledWith({ theme: 'light' })
    })
  })

  it('explains that preferences stay local when the profile service is unavailable', async () => {
    getUserProfile.mockResolvedValue(null)
    renderSettings()

    expect(await screen.findByRole('status')).toHaveTextContent('偏好将只保存在本机')
  })

  it('downloads the account data export on demand', async () => {
    getUserProfile.mockResolvedValue(null)
    downloadExport.mockResolvedValue('firefly-isle-export-2026-09-02.json')
    renderSettings()

    await userEvent.click(await screen.findByTestId('settings-export-button'))

    await waitFor(() => {
      expect(downloadExport).toHaveBeenCalledTimes(1)
    })
  })

  it('requires the typed confirmation word before account deletion', async () => {
    getUserProfile.mockResolvedValue(null)
    deleteOwnAccount.mockResolvedValue(undefined)
    renderSettings()

    const deleteButton = await screen.findByTestId('settings-delete-button')

    expect(deleteButton).toBeDisabled()

    await userEvent.type(screen.getByTestId('settings-delete-confirm-input'), '删除')

    expect(deleteButton).toBeEnabled()

    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(deleteOwnAccount).toHaveBeenCalledTimes(1)
    })
  })
})
