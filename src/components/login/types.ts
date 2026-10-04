/**
 * [INPUT]: 依赖 react 的 FormEvent 类型与 @/lib/theme 的 Theme 类型。
 * [OUTPUT]: 对外提供登录展示层 AuthMode、AuthMethod、AuthFeedback、LoginPageViewProps 与 V3LoginProps 类型。
 * [POS]: components/login 的类型边界，被登录容器、facade 与登录内部展示模块共享。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { FormEvent } from 'react'

import type { Theme } from '@/lib/theme'

export type AuthMode = 'login' | 'sign-up' | 'password-reset'
export type AuthMethod = 'email' | 'phone'
export type FeedbackTone = 'error' | 'success' | 'neutral'

export type AuthFeedback = {
  tone: FeedbackTone
  message: string
}

export type LoginPageViewProps = {
  authMethod: AuthMethod
  authError?: string | null
  defaultAuthOpen?: boolean
  email: string
  feedback: AuthFeedback | null
  isSubmitting: boolean
  mode: AuthMode
  onAnonymousLogin: () => void
  onAuthMethodChange: (method: AuthMethod) => void
  onEmailChange: (value: string) => void
  onGoogleLogin: () => void
  onModeChange: (mode: AuthMode) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onToggleTheme: () => void
  password: string
  theme: Theme
}

export type V3LoginProps = Omit<LoginPageViewProps, 'theme'> & {
  theme: Theme
}
