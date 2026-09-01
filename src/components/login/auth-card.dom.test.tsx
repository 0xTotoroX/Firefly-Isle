// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、@testing-library/react、@testing-library/user-event、@testing-library/jest-dom、react-router-dom 的 MemoryRouter 与 ./auth-card。
 * [OUTPUT]: 对外提供 AuthCard 展示层的真实渲染行为回归测试。
 * [POS]: components/login 的认证卡 DOM 测试，验证受控输入回调、表单提交回调、提交禁用态、反馈块渲染与重置模式切换入口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AuthCard } from './auth-card'
import type { AuthFeedback } from './types'

function renderAuthCard(overrides: Partial<Parameters<typeof AuthCard>[0]> = {}) {
  const props: Parameters<typeof AuthCard>[0] = {
    authMethod: 'email',
    currentFeedback: null,
    email: '',
    isSubmitting: false,
    locale: 'zh',
    mode: 'login',
    onAnonymousLogin: vi.fn(),
    onAuthMethodChange: vi.fn(),
    onEmailChange: vi.fn(),
    onGoogleLogin: vi.fn(),
    onModeChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onSubmit: vi.fn(),
    password: '',
    privacySummary: '数据仅用于整理病历',
    theme: 'dark',
    ...overrides,
  }

  return render(
    <MemoryRouter>
      <AuthCard {...props} />
    </MemoryRouter>,
  )
}

describe('AuthCard', () => {
  it('routes controlled input changes through the injected callbacks', async () => {
    const onEmailChange = vi.fn()
    const onPasswordChange = vi.fn()
    renderAuthCard({ onEmailChange, onPasswordChange })

    await userEvent.type(screen.getByPlaceholderText('输入邮箱地址'), 'a')
    await userEvent.type(screen.getByTestId('login-password-input'), 'b')

    expect(onEmailChange).toHaveBeenCalledWith('a')
    expect(onPasswordChange).toHaveBeenCalledWith('b')
  })

  it('submits the form through the injected submit callback', async () => {
    const onSubmit = vi.fn()
    renderAuthCard({ email: 'a@b.co', password: 'secret', onSubmit })

    await userEvent.click(screen.getByTestId('login-submit-button'))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('disables the submit action while submitting', () => {
    renderAuthCard({ isSubmitting: true })

    expect(screen.getByTestId('login-submit-button')).toBeDisabled()
  })

  it('renders auth feedback inside the form', () => {
    const feedback: AuthFeedback = { message: '登录失败，请重试', tone: 'error' }
    renderAuthCard({ currentFeedback: feedback })

    expect(screen.getByText('登录失败，请重试')).toBeVisible()
  })

  it('offers the password-reset mode switch and phone method switch', async () => {
    const onModeChange = vi.fn()
    const onAuthMethodChange = vi.fn()
    renderAuthCard({ onAuthMethodChange, onModeChange })

    await userEvent.click(screen.getByRole('button', { name: '手机' }))
    await userEvent.click(screen.getByRole('button', { name: '忘记密码？' }))

    expect(onAuthMethodChange).toHaveBeenCalledWith('phone')
    expect(onModeChange).toHaveBeenCalledWith('password-reset')
  })
})
