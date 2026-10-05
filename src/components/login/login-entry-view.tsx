/**
 * [INPUT]: 依赖 SourceLicenseLink 的公开源码入口； 依赖 react 的 CSSProperties/ref/state、BackgroundMusicToggle、BrandMark/Wordmark、LoginTraceMap、LoginStorySections、useScrollStoryMotion、AuthOverlay、locale/copy 与隐私摘要文案。
 * [OUTPUT]: 对外提供 V3LoginView，编排八章纵向滚动叙事、首尾同源登录 CTA、单一认证弹层、首屏工具区与仅在 reduced-motion 下禁用的长生命周期液体背景。
 * [POS]: components/login 的登录入口编排层，被 login-page-view facade 消费；只持有一次认证状态，不侵入认证业务语义。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { brand } from '@/lib/brand'
import { useRef, useState, type CSSProperties } from 'react'

import { BackgroundMusicToggle } from '@/components/background-music-toggle'
import { BrandWordmark } from '@/components/system/brand-wordmark'
import { BrandMark } from '@/components/system/brand-mark'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { PRIVACY_POLICY_SUMMARY } from '@/lib/privacy'
import { SourceLicenseLink } from '@/components/system/source-license-link'
import type { Theme } from '@/lib/theme'

import { AuthOverlay } from './auth-overlay'
import type { AuthCardProps } from './auth-card'
import { LoginStorySections } from './login-story-sections'
import { LoginTraceMap } from './login-trace-map'
import { useScrollStoryMotion } from './scroll-story-motion'
import { loginThemeSkins } from './skins'
import type { V3LoginProps } from './types'

function LoginCtaGlyph() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path d="M10 7 15 12l-5 5M15 12H3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <path d="M13 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  )
}

function preserveScrollPosition(action: () => void) {
  if (typeof window === 'undefined') {
    action()
    return
  }

  const scrollX = window.scrollX
  const scrollY = window.scrollY
  action()
  window.requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY)
    window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
  })
}

function IntroAccessCta({
  isOpen,
  locale,
  onOpen,
}: {
  isOpen: boolean
  locale: 'zh' | 'en'
  onOpen: () => void
}) {
  return (
    <button
      aria-controls="login-auth-card"
      aria-expanded={isOpen}
      className="t-control-press inline-flex min-h-[52px] min-w-[156px] items-center justify-center gap-2.5 rounded-[12px] bg-[var(--ff-accent-primary)] px-6 text-base font-bold text-[var(--ff-accent-foreground)] shadow-[0_10px_18px_rgba(5,9,11,0.22)] transition-colors hover:bg-[var(--ff-accent-strong)]"
      data-testid="login-auth-cta"
      onClick={onOpen}
      type="button"
    >
      <LoginCtaGlyph />
      <span className="whitespace-nowrap">{locale === 'zh' ? '登录' : 'Login'}</span>
    </button>
  )
}

function LoginPageUtilityControls({
  locale,
  onToggleTheme,
  style,
  theme,
  toggleLocale,
}: {
  locale: 'zh' | 'en'
  onToggleTheme: () => void
  style?: CSSProperties
  theme: Theme
  toggleLocale: () => void
}) {
  const isDark = theme === 'dark'
  const skin = loginThemeSkins[theme]

  return (
    <div
      className={`t-stagger relative z-20 mt-6 flex w-full max-w-[calc(100vw-3.5rem)] flex-wrap items-center justify-center gap-2 rounded-[14px] border px-3 py-3 text-sm font-semibold backdrop-blur-md sm:gap-4 sm:px-5 sm:text-base lg:fixed lg:bottom-6 lg:left-auto lg:right-6 lg:z-[60] lg:w-fit lg:max-w-[calc(100vw-3rem)] lg:flex-nowrap lg:justify-start lg:gap-5 lg:px-6 ${skin.utilityShell}`}
      data-testid="login-page-utility-controls"
      style={style}
    >
      <button className={`t-control-press inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-2 ${skin.utilityButton}`} onClick={() => preserveScrollPosition(onToggleTheme)} type="button">
        <span className="material-symbols-outlined shrink-0 text-[24px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
        {getCopy(copy.shell.nav.themeToggle, locale)}
      </button>
      <span className={`h-5 w-px ${skin.utilityDivider}`} />
      <button className={`t-control-press inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-2 ${skin.utilityButton}`} onClick={() => preserveScrollPosition(toggleLocale)} type="button">
        <span className="material-symbols-outlined shrink-0 text-[24px]">g_translate</span>
        {getCopy(copy.shell.nav.languageToggle, locale)}
      </button>
      <span className={`h-5 w-px ${skin.utilityDivider}`} />
      <BackgroundMusicToggle className={`gap-1.5 whitespace-nowrap sm:gap-2 ${skin.utilityButton}`} showLabel />
    </div>
  )
}

function LoginPrivacyNote({ locale }: { locale: 'zh' | 'en' }) {
  return (
    <a className="inline-flex min-h-11 items-center text-sm leading-6 text-[var(--ff-text-secondary)] underline decoration-[var(--ff-border-default)] underline-offset-4 hover:text-[var(--ff-text-primary)]" data-testid="login-privacy-note" href="/privacy">
      {locale === 'zh' ? '录入前，了解资料如何处理' : 'Learn how your information is handled'}
    </a>
  )
}

export function V3LoginView({
  authMethod,
  authError,
  defaultAuthOpen = false,
  email,
  feedback,
  isSubmitting,
  googleAvailable,
  mode,
  onAnonymousLogin,
  onAuthMethodChange,
  onEmailChange,
  onGoogleLogin,
  onModeChange,
  onPasswordChange,
  onSubmit,
  onToggleTheme,
  password,
  theme,
}: V3LoginProps) {
  const { locale, toggleLocale } = useLocale()
  const [isAuthOpen, setIsAuthOpen] = useState(defaultAuthOpen)
  const storyRootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const { isHeroVisualActive, prefersReducedMotion } = useScrollStoryMotion({
    heroRef,
    locale,
    rootRef: storyRootRef,
    theme,
  })
  const currentFeedback = feedback ?? (authError ? { message: authError, tone: 'error' as const } : null)
  const privacySummary =
    locale === 'zh'
      ? PRIVACY_POLICY_SUMMARY
      : 'By continuing, you agree to the privacy policy. Clinical text is used only for structured processing.'
  const skin = loginThemeSkins[theme]
  const authCardProps: AuthCardProps = {
    authMethod,
    currentFeedback,
    email,
    isSubmitting,
    googleAvailable,
    locale,
    mode,
    onAnonymousLogin,
    onAuthMethodChange,
    onEmailChange,
    onGoogleLogin,
    onModeChange,
    onPasswordChange,
    onSubmit,
    password,
    privacySummary,
    theme,
  }
  const openAuth = () => setIsAuthOpen(true)

  return (
    <div
      className={`min-h-dvh w-full overflow-x-clip font-[var(--ff-font-ui)] ${skin.root}`}
      data-scroll-story-mode={prefersReducedMotion ? 'reduced' : 'animated'}
      data-scroll-story-motion-count="0"
      data-story-webgl-active={isHeroVisualActive ? 'true' : 'false'}
      ref={storyRootRef}
    >
      <main className="min-h-dvh w-full">
        <section
          aria-labelledby="story-hero-title"
          className={`story-section t-route-reveal relative min-h-dvh min-w-0 overflow-hidden px-7 pb-8 pt-24 md:px-14 md:py-12 ${skin.section}`}
          data-story-chapter="hero"
          id="story-hero"
          ref={heroRef}
        >
          <LoginTraceMap enabled={!prefersReducedMotion} locale={locale} theme={theme} />
          <div className="relative z-10 flex min-h-[calc(100dvh-8rem)] flex-col md:min-h-[calc(100dvh-6rem)]">
            <div className="t-stagger flex flex-col gap-6 md:flex-row md:items-start" style={{ '--t-order': 0 } as CSSProperties}>
              <div className="flex min-w-0 items-center gap-4 md:gap-6">
                <BrandMark className="h-16 w-16 md:h-[72px] md:w-[72px]" />
                <div className="min-w-0">
                  <BrandWordmark className="max-w-[min(17rem,calc(100vw-7rem))] md:max-w-[22rem]" locale={locale} scale="login" />
                </div>
              </div>
            </div>

            <div className="t-stagger mt-[12vh] w-full max-w-[calc(100vw-3.5rem)] md:mt-[16vh] md:max-w-[48rem]" style={{ '--t-order': 1 } as CSSProperties}>
              <div
                className={`mb-5 inline-flex items-center gap-3 text-sm font-medium leading-6 text-[var(--ff-text-secondary)]`}
                data-testid="login-intro-eyebrow"
              >
                <span className="h-0.5 w-10 bg-[var(--ff-accent-primary)]" />
                <span>{brand.tagline[locale]}</span>
              </div>
              <h1 className={`max-w-[calc(100vw-3.5rem)] break-words text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.25] tracking-normal md:max-w-[48rem] ${skin.heading}`} id="story-hero-title">
                {locale === 'zh' ? '治疗的每一步，都有迹可循。' : 'Keep track of every step of care.'}
              </h1>
              <p className={`t-stagger mt-7 max-w-[40rem] text-base leading-8 md:text-lg ${skin.bodyCopy}`} style={{ '--t-order': 2 } as CSSProperties}>
                {locale === 'zh'
                  ? '集中整理检查、诊断、用药与治疗记录，持续追踪指标、副作用和随访。让患者和家属回看治疗经过，就诊沟通时有据可查。'
                  : 'Keep tests, diagnoses, medicines and treatment records together. Track labs, side effects and follow-ups, and bring a clear history to each appointment.'}
              </p>
            </div>

            <div className="t-stagger mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center" style={{ '--t-order': 3 } as CSSProperties}>
              <IntroAccessCta isOpen={isAuthOpen} locale={locale} onOpen={openAuth} />
              <LoginPrivacyNote locale={locale} />
              <SourceLicenseLink locale={locale} />
            </div>
          </div>
        </section>

        <div className="relative z-20 flex justify-center px-7 pb-8 md:px-14 lg:contents" data-story-utility-shell="global">
          <LoginPageUtilityControls
            locale={locale}
            onToggleTheme={onToggleTheme}
            style={{ '--t-order': 4 } as CSSProperties}
            theme={theme}
            toggleLocale={toggleLocale}
          />
        </div>

        <LoginStorySections
          closingCta={<IntroAccessCta isOpen={isAuthOpen} locale={locale} onOpen={openAuth} />}
          locale={locale}
          theme={theme}
        />

        {isAuthOpen ? <AuthOverlay {...authCardProps} onClose={() => setIsAuthOpen(false)} /> : null}
      </main>
    </div>
  )
}
