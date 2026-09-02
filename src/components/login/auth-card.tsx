/**
 * [INPUT]: 依赖 react 的 ReactNode、react-router-dom 的 Link、登录 skin/token、auth-copy、隐私页路径、本地化文案与 transitions-dev.css 的 control/tab/accordion/popover 动效合同。
 * [OUTPUT]: 对外提供 AuthCard 与 AuthCardProps，渲染带反馈动效的邮箱/手机登录、Google、微信占位、匿名会话与隐私入口。
 * [POS]: components/login 的认证卡主体，被 AuthOverlay 消费，不触碰 Supabase 认证状态机。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { copy, getCopy } from '@/lib/copy'
import { PRIVACY_PAGE_HREF } from '@/lib/privacy'
import type { Theme } from '@/lib/theme'

import { getAuthModeCopy } from './auth-copy'
import { authCardSkins, lightAuthScene, nightIslandAuthScene } from './skins'
import type { AuthFeedback, AuthMethod, V3LoginProps } from './types'

function feedbackClass(feedback: AuthFeedback, theme: Theme) {
  if (feedback.tone === 'error') {
    return 'border-[var(--ff-accent-primary)] text-[var(--ff-accent-primary)]'
  }

  if (feedback.tone === 'success') {
    return 'border-[var(--ff-accent-success)] text-[var(--ff-accent-success)]'
  }

  return authCardSkins[theme].feedbackNeutral
}

function AuthFeedbackBlock({ feedback, theme }: { feedback: AuthFeedback | null; theme: Theme }) {
  if (!feedback) {
    return null
  }

  return (
    <div
      className={`t-popover rounded-[var(--ff-radius-md)] border px-4 py-3 text-sm ${authCardSkins[theme].feedbackSurface} ${feedbackClass(feedback, theme)}`}
      role={feedback.tone === 'error' ? 'alert' : 'status'}
    >
      {feedback.message}
    </div>
  )
}

function AuthBeaconPreview({ subtitle, theme, title }: { subtitle: string; theme: Theme; title: string }) {
  const skin = authCardSkins[theme]

  return (
    <div className={`relative h-[clamp(176px,28vh,304px)] overflow-hidden rounded-t-[28px] ${skin.hero}`}>
      <img
        alt=""
        className={`absolute inset-0 h-full w-full object-cover object-center ${skin.heroImage}`}
        draggable={false}
        src={theme === 'dark' ? nightIslandAuthScene : lightAuthScene}
      />
      <div className={`absolute inset-0 ${skin.heroGradient}`} />
      <div className="absolute bottom-7 left-0 right-0 px-6 text-left md:bottom-8">
        <h2 className={`text-[1.95rem] font-black leading-none tracking-normal md:text-[2.25rem] ${skin.heroTitle}`} data-testid="login-auth-card-title">
          {title}
        </h2>
        <p className={`mt-2.5 text-sm font-semibold ${skin.heroSubtitle}`}>
          {subtitle}
        </p>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-16 ${skin.surface}`} />
    </div>
  )
}

function SocialButton({
  disabled,
  icon,
  label,
  onClick,
  theme,
}: {
  disabled: boolean
  icon: ReactNode
  label: string
  onClick: () => void
  theme: Theme
}) {
  const skin = authCardSkins[theme]

  return (
    <button
      aria-label={label}
      className={`t-control-press flex h-12 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-[10px] border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${skin.socialButton}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${skin.socialIcon}`}>
        {icon}
      </span>
      <span className={`text-sm font-semibold leading-none ${skin.socialLabel}`}>{label}</span>
    </button>
  )
}

export function WeChatComingSoonPanel({ locale, theme }: { locale: 'zh' | 'en'; theme: Theme }) {
  const skin = authCardSkins[theme]
  const shellClass =
    theme === 'dark'
      ? 'border-[#353b3b] bg-[rgba(255,255,255,0.025)] text-[#d9d1c4]/74 shadow-[inset_0_0_18px_rgba(255,255,255,0.012)]'
      : 'border-[#d1dfe0] bg-white/58 text-[#334844]/72 shadow-[0_10px_20px_rgba(98,124,129,0.06)]'
  const comingSoonClass = theme === 'dark' ? 'text-white/44' : 'text-[#7b8f8c]'

  return (
    <div
      aria-label={locale === 'zh' ? '微信敬请期待' : 'WeChat coming soon'}
      className={`t-control-press flex h-12 min-w-0 flex-1 cursor-default items-center justify-center gap-2.5 rounded-[10px] border px-3 text-sm font-semibold ${shellClass}`}
      data-testid="login-wechat-coming-soon"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <WeChatGlyph />
      </span>
      <span className="flex min-w-0 items-baseline gap-1.5 leading-none">
        <span className={`text-sm font-semibold ${skin.socialLabel}`}>{getCopy(copy.login.auth.wechat, locale)}</span>
        <span className={`text-[11px] font-bold ${comingSoonClass}`}>
          {locale === 'zh' ? '敬请期待' : 'Coming soon'}
        </span>
      </span>
    </div>
  )
}

function GoogleBrandGlyph() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.68 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15A10.97 10.97 0 0 0 1 12c0 1.77.42 3.44 1.15 4.94l3.69-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.68 1 3.96 3.47 2.15 7.06l3.69 2.84C6.71 7.3 9.14 5.37 12 5.37z"
        fill="#EA4335"
      />
    </svg>
  )
}

function WeChatGlyph() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="#07C160" r="11" />
      <path
        d="M9.1 8.1c-2.45 0-4.43 1.55-4.43 3.46 0 1.1.66 2.07 1.68 2.7l-.39 1.16 1.42-.69c.53.18 1.12.29 1.72.29 2.45 0 4.43-1.55 4.43-3.46S11.55 8.1 9.1 8.1Zm-1.46 2.77a.47.47 0 1 1 0-.94.47.47 0 0 1 0 .94Zm2.9 0a.47.47 0 1 1 0-.94.47.47 0 0 1 0 .94Z"
        fill="#fff"
      />
      <path
        d="M15.17 11.26c2.1 0 3.8 1.33 3.8 2.96 0 .94-.56 1.77-1.43 2.31l.34 1-1.22-.59c-.46.16-.96.24-1.49.24-2.1 0-3.8-1.33-3.8-2.96 0-1.64 1.7-2.96 3.8-2.96Zm-1.25 2.37a.4.4 0 1 0 0-.8.4.4 0 0 0 0 .8Zm2.49 0a.4.4 0 1 0 0-.8.4.4 0 0 0 0 .8Z"
        fill="#fff"
      />
    </svg>
  )
}

export function AuthMethodTabs({
  authMethod,
  locale,
  onAuthMethodChange,
  theme,
}: {
  authMethod: AuthMethod
  locale: 'zh' | 'en'
  onAuthMethodChange: (method: AuthMethod) => void
  theme: Theme
}) {
  const options: Array<{ label: string; method: AuthMethod }> = [
    { label: locale === 'zh' ? '邮箱' : 'Email', method: 'email' },
    { label: locale === 'zh' ? '手机' : 'Phone', method: 'phone' },
  ]
  const shellClass = theme === 'dark' ? 'border-white/10 bg-white/[0.035]' : 'border-[#d5e2e3] bg-[#eef6f6]'
  const activeClass = theme === 'dark' ? 'bg-white/10 text-white' : 'bg-white text-[#172522] shadow-[0_6px_18px_rgba(98,124,129,0.12)]'
  const inactiveClass = theme === 'dark' ? 'text-white/50 hover:text-white/82' : 'text-[#6b7d7a] hover:text-[#172522]'

  return (
    <div className={`t-tab-switch grid grid-cols-2 rounded-[12px] border p-1 ${shellClass}`} data-testid="login-auth-method-tabs">
      {options.map((option) => (
        <button
          aria-pressed={authMethod === option.method}
          className={`t-control-press min-h-[38px] rounded-[9px] text-sm font-bold transition-colors ${authMethod === option.method ? activeClass : inactiveClass}`}
          key={option.method}
          onClick={() => onAuthMethodChange(option.method)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function CredentialField({
  children,
  fieldId,
  icon,
  label,
  theme,
  trailing,
}: {
  children: ReactNode
  fieldId: string
  icon: string
  label: string
  theme: Theme
  trailing?: ReactNode
}) {
  const skin = authCardSkins[theme]

  return (
    <div className="space-y-1.5">
      <label className={`block text-xs font-semibold ${skin.fieldLabel}`} htmlFor={fieldId}>
        {label}
      </label>
      <div className={`flex min-h-[50px] items-center gap-3 rounded-[10px] border px-4 transition-colors ${skin.field}`}>
        <span className={`material-symbols-outlined text-[20px] ${skin.fieldIcon}`}>{icon}</span>
        {children}
        {trailing}
      </div>
    </div>
  )
}

export function PhoneComingSoonPanel({ locale, theme }: { locale: 'zh' | 'en'; theme: Theme }) {
  const skin = authCardSkins[theme]

  return (
    <div
      className={`t-accordion rounded-[14px] border px-4 py-5 text-center ${theme === 'dark' ? 'border-white/10 bg-white/[0.035]' : 'border-[#d5e2e3] bg-[#f8fbfb]'}`}
      data-testid="login-phone-coming-soon"
    >
      <div className={`text-lg font-black ${skin.socialLabel}`}>
        {locale === 'zh' ? '敬请期待' : 'Coming soon'}
      </div>
      <p className={`mt-2 text-sm font-semibold leading-6 ${skin.modeHint}`}>
        {locale === 'zh'
          ? '手机验证码会在完成短信服务与防刷策略后开放。现在请先使用 Google 或邮箱。'
          : 'Phone codes will open after SMS delivery and abuse protection are configured. Use Google or email for now.'}
      </p>
    </div>
  )
}

function LoginSubmitButton({
  isSubmitting,
  label,
}: {
  isSubmitting: boolean
  label: string
}) {
  return (
    <button
      className="t-control-press flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[14px] bg-[var(--ff-accent-primary)] px-5 text-base font-bold text-white shadow-[0_16px_34px_rgba(232,93,42,0.22)] transition-colors hover:bg-[var(--ff-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      data-testid="login-submit-button"
      disabled={isSubmitting}
      type="submit"
    >
      <span>{label}</span>
    </button>
  )
}

export type AuthCardProps = Pick<
  V3LoginProps,
  | 'email'
  | 'authMethod'
  | 'isSubmitting'
  | 'mode'
  | 'onAnonymousLogin'
  | 'onAuthMethodChange'
  | 'onEmailChange'
  | 'onGoogleLogin'
  | 'onModeChange'
  | 'onPasswordChange'
  | 'onSubmit'
  | 'password'
> & {
  currentFeedback: AuthFeedback | null
  id?: string
  locale: 'zh' | 'en'
  privacySummary: string
  theme: Theme
}

export function AuthCard({
  currentFeedback,
  email,
  id,
  isSubmitting,
  locale,
  mode,
  onAnonymousLogin,
  onEmailChange,
  onGoogleLogin,
  onModeChange,
  onPasswordChange,
  onSubmit,
  password,
  privacySummary,
  theme,
}: AuthCardProps) {
  const fieldIdPrefix = id ?? 'login-auth-card'
  const emailFieldId = `${fieldIdPrefix}-email`
  const passwordFieldId = `${fieldIdPrefix}-password`
  const skin = authCardSkins[theme]
  const activeAuthMethod = 'email'
  const modeCopy = getAuthModeCopy(mode, locale, activeAuthMethod)
  const showPasswordField = mode !== 'password-reset'
  const showSessionAlternatives = mode !== 'password-reset'
  const submitLabel = isSubmitting ? getCopy(copy.workspace.composer.processing, locale) : modeCopy.submitLabel

  return (
    <div
      className={`mx-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-[568px] flex-col overflow-x-hidden overflow-y-auto rounded-[28px] border ${skin.card}`}
      data-testid="login-auth-card-surface"
      id={id}
    >
      <AuthBeaconPreview subtitle={modeCopy.subtitle} theme={theme} title={modeCopy.title} />
      <div className={`px-5 pb-5 pt-4 md:px-6 ${skin.body}`}>
        <form className="space-y-3" onSubmit={onSubmit}>
          <AuthFeedbackBlock feedback={currentFeedback} theme={theme} />

          <CredentialField fieldId={emailFieldId} icon="mail" label={locale === 'zh' ? '邮箱' : 'Email'} theme={theme}>
              <span className="sr-only">{getCopy(copy.login.auth.emailLabelLight, locale)}</span>
              <input
                autoComplete="email"
                className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none ${skin.fieldInput}`}
                id={emailFieldId}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder={locale === 'zh' ? '输入邮箱地址' : 'Enter email address'}
                required
                type="email"
                value={email}
              />
            </CredentialField>

          {showPasswordField ? (
            <CredentialField
              fieldId={passwordFieldId}
              icon="key"
              label={locale === 'zh' ? '密码' : 'Password'}
              theme={theme}
              trailing={<span className={`material-symbols-outlined text-[20px] ${skin.trailingIcon}`}>visibility</span>}
            >
              <span className="sr-only">{locale === 'zh' ? '密码 / 加密密钥' : 'Password / Encryption Key'}</span>
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none ${skin.fieldInput}`}
                data-testid="login-password-input"
                id={passwordFieldId}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder={modeCopy.passwordPlaceholder}
                required
                type="password"
                value={password}
              />
            </CredentialField>
          ) : null}

          {mode === 'login' ? (
            <div className="t-accordion flex justify-end text-sm font-semibold">
              <button
                className={`t-control-press shrink-0 ${skin.forgotLink}`}
                onClick={() => onModeChange('password-reset')}
                type="button"
              >
                {modeCopy.forgotPassword}
              </button>
            </div>
          ) : null}

          <LoginSubmitButton isSubmitting={isSubmitting} label={submitLabel} />

          {showSessionAlternatives ? (
            <>
              <div className="flex items-center gap-4 py-1">
                <span className={`h-px flex-1 ${skin.divider}`} />
                <span className={`text-xs font-semibold ${skin.dividerText}`}>{locale === 'zh' ? '或' : 'or'}</span>
                <span className={`h-px flex-1 ${skin.divider}`} />
              </div>

              <SocialButton
                disabled={isSubmitting}
                icon={<GoogleBrandGlyph />}
                label={getCopy(copy.login.auth.google, locale)}
                onClick={onGoogleLogin}
                theme={theme}
              />

              <button
                className={`t-control-press flex min-h-[52px] w-full items-center justify-center gap-3 rounded-[14px] border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${skin.anonymousButton}`}
                disabled={isSubmitting}
                onClick={onAnonymousLogin}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                <span className="flex min-w-0 flex-col items-start leading-tight sm:flex-row sm:items-center sm:gap-2">
                  <span className="whitespace-nowrap">{locale === 'zh' ? '匿名会话' : 'Anonymous session'}</span>
                  <span className={`text-xs font-medium ${skin.anonymousSubLabel}`}>
                    {locale === 'zh' ? '创建匿名身份并保存到当前会话' : 'Create an anonymous identity for this session'}
                  </span>
                </span>
              </button>
            </>
          ) : null}
        </form>

        <p className={`t-accordion mt-3 rounded-[var(--ff-radius-full)] px-4 py-1.5 text-center text-[11px] leading-5 ${skin.privacy}`}>
          <span className="material-symbols-outlined mr-2 inline text-base align-[-3px]">verified_user</span>
          {privacySummary}
          {' '}
          <Link className={`underline underline-offset-4 ${skin.privacyLink}`} to={PRIVACY_PAGE_HREF}>
            {getCopy(copy.login.footer.fullPrivacy, locale)}
          </Link>
        </p>
        <p className={`t-accordion mt-3 text-center text-xs font-semibold ${skin.modeHint}`}>
          {modeCopy.footerPrompt}
          {' '}
          <button
            className={`t-control-press underline underline-offset-4 ${skin.modeButton}`}
            onClick={() => onModeChange(modeCopy.footerMode)}
            type="button"
          >
            {modeCopy.footerAction}
          </button>
        </p>
      </div>
    </div>
  )
}
