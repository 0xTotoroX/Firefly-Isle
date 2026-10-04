/**
 * [INPUT]: 依赖 @/lib/copy 的登录文案真相源与 components/login/types 的认证模式类型。
 * [OUTPUT]: 对外提供 getAuthModeCopy 与 AuthModeCopy，用于邮箱、手机与重置密码模式的认证卡文案。
 * [POS]: components/login 的认证文案选择器，隔离 AuthCard JSX 与模式分支文案。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { copy, getCopy } from '@/lib/copy'

import type { AuthMethod, AuthMode } from './types'

export type AuthModeCopy = {
  dialogLabel: string
  footerAction: string
  footerMode: AuthMode
  footerPrompt: string
  forgotPassword: string
  passwordPlaceholder: string
  submitLabel: string
  subtitle: string
  title: string
}

export function getAuthModeCopy(mode: AuthMode, locale: 'zh' | 'en', authMethod: AuthMethod = 'email'): AuthModeCopy {
  if (authMethod === 'phone' && mode !== 'password-reset') {
    return {
      dialogLabel: locale === 'zh' ? '手机登录' : 'Phone login',
      footerAction: getCopy(copy.login.auth.login, locale),
      footerMode: 'login',
      footerPrompt: '',
      forgotPassword: locale === 'zh' ? '忘记密码？' : 'Forgot password?',
      passwordPlaceholder: locale === 'zh' ? '短信验证码' : 'SMS code',
      submitLabel: locale === 'zh' ? '进入工作区' : 'Enter workspace',
      subtitle: locale === 'zh' ? '手机号入口准备中，当前请使用 Google 或邮箱。' : 'Phone access is being prepared. Use Google or email for now.',
      title: locale === 'zh' ? '手机登录' : 'Phone login',
    }
  }

  if (mode === 'password-reset') {
    return {
      dialogLabel: locale === 'zh' ? '重置密码' : 'Reset password',
      footerAction: getCopy(copy.login.auth.login, locale),
      footerMode: 'login',
      footerPrompt: locale === 'zh' ? '想起来了？' : 'Remembered it?',
      forgotPassword: locale === 'zh' ? '忘记密码？' : 'Forgot password?',
      passwordPlaceholder: locale === 'zh' ? '访问密钥（区分大小写）' : 'Access key (case sensitive)',
      submitLabel: locale === 'zh' ? '发送重置邮件' : 'Send reset email',
      subtitle: locale === 'zh' ? '输入注册邮箱，我们会发送密码重置邮件。' : 'Enter your account email and we will send a reset link.',
      title: locale === 'zh' ? '重置密码' : 'Reset password',
    }
  }

  if (mode === 'sign-up') {
    return {
      dialogLabel: getCopy(copy.login.auth.signup, locale),
      footerAction: getCopy(copy.login.auth.login, locale),
      footerMode: 'login',
      footerPrompt: locale === 'zh' ? '已有账户？' : 'Already have an account?',
      forgotPassword: locale === 'zh' ? '忘记密码？' : 'Forgot password?',
      passwordPlaceholder: locale === 'zh' ? '创建访问密钥' : 'Create an access key',
      submitLabel: getCopy(copy.login.auth.submitSignup, locale),
      subtitle: locale === 'zh' ? '创建账户后直接进入工作区。' : 'Create an account and enter the workspace directly.',
      title: getCopy(copy.login.auth.signup, locale),
    }
  }

  return {
    dialogLabel: getCopy(copy.login.auth.login, locale),
    footerAction: getCopy(copy.login.auth.signup, locale),
    footerMode: 'sign-up',
    footerPrompt: locale === 'zh' ? '还没有账户？' : 'No account yet?',
    forgotPassword: locale === 'zh' ? '忘记密码？' : 'Forgot password?',
    passwordPlaceholder: locale === 'zh' ? '访问密钥（区分大小写）' : 'Access key (case sensitive)',
    submitLabel: getCopy(copy.login.auth.login, locale),
    subtitle: locale === 'zh' ? '此程虽艰，您永不踽踽独行。' : 'The road may be hard, but you never walk alone.',
    title: getCopy(copy.login.auth.login, locale),
  }
}
