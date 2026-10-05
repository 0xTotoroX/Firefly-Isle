/**
 * [INPUT]: 依赖 react 的 ReactNode、react-router-dom 的 Link、登录 skin/token、auth-copy、隐私页路径、本地化文案与 motion.css 的 control/tab/accordion/popover 动效合同。
 * [OUTPUT]: 对外提供 AuthCard 与 AuthCardProps，渲染带反馈动效的邮箱登录、Google、匿名会话与隐私入口。
 * [POS]: components/login 的认证卡主体，被 AuthOverlay 消费，不触碰 Supabase 认证状态机。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { copy, getCopy } from '@/lib/copy'
import { PRIVACY_PAGE_HREF } from '@/lib/privacy'
import type { Theme } from '@/lib/theme'

import { getAuthModeCopy } from './auth-copy'
import { authCardSkins, lightAuthScene, nightIslandAuthScene } from './skins'
import type { AuthFeedback, V3LoginProps } from './types'

function feedbackClass(feedback: AuthFeedback, theme: Theme) {
  if (feedback.tone === 'error') {
    return 'border-[var(--ff-accent-primary)] text-[var(--ff-accent-text)]'
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
      <div className="absolute bottom-7 left-0 right-0 z-10 px-6 text-left md:bottom-8">
        <h2 className={`text-[1.95rem] font-semibold leading-tight tracking-normal md:text-[2.25rem] ${skin.heroTitle}`} data-testid="login-auth-card-title">
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

function LoginSubmitButton({
  isSubmitting,
  label,
}: {
  isSubmitting: boolean
  label: string
}) {
  return (
    <button
      className="t-control-press flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[14px] bg-[var(--ff-accent-primary)] px-5 text-base font-bold text-[var(--ff-accent-foreground)] shadow-[0_16px_34px_rgba(232,93,42,0.22)] transition-colors hover:bg-[var(--ff-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
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
  | 'googleAvailable'
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
  googleAvailable = true,
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
              <span className="sr-only">{locale === 'zh' ? '密码' : 'Password'}</span>
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
                disabled={isSubmitting || !googleAvailable}
                icon={<GoogleBrandGlyph />}
                label={googleAvailable ? getCopy(copy.login.auth.google, locale) : locale === 'zh' ? 'Google 暂不可用' : 'Google unavailable'}
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

        <p className={`t-accordion mt-3 rounded-[var(--ff-radius-full)] px-4 py-1.5 text-center text-[13px] leading-6 ${skin.privacy}`}>
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
