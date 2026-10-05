// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、@testing-library/react、@testing-library/user-event、@testing-library/jest-dom、react-router-dom 的 MemoryRouter 与 ./auth-card。
 * [OUTPUT]: 对外提供 AuthCard 展示层的真实渲染行为回归测试。
 * [POS]: components/login 的认证卡 DOM 测试，验证受控输入回调、表单提交回调、提交禁用态、反馈块渲染与重置模式切换入口。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
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
  it('clearly disables an unavailable Google provider without calling OAuth', async () => {
    const onGoogleLogin = vi.fn()
    renderAuthCard({ googleAvailable: false, onGoogleLogin })
    const button = screen.getByRole('button', { name: 'Google 暂不可用' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onGoogleLogin).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /匿名会话/ })).toBeEnabled()
  })

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

  it('keeps email and Google visible and hides phone and WeChat from the card', async () => {
    const onModeChange = vi.fn()
    renderAuthCard({ onModeChange })

    expect(screen.queryByRole('button', { name: '手机' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('微信敬请期待')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Google' })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: '忘记密码？' }))

    expect(onModeChange).toHaveBeenCalledWith('password-reset')
  })
})
