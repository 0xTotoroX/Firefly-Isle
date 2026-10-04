/**
 * [INPUT]: 依赖 node:fs 的源码合同检查，依赖 react-dom/server 的静态渲染，依赖 react-router-dom 的 MemoryRouter，依赖 BackgroundAudioProvider 与 ./login-page-view 的 LoginPageView。
 * [OUTPUT]: 对外提供登录页八章叙事、单一认证弹层、SSR 安全 ScrollTrigger、reduced-motion、Transitions.dev 与单一 WebGL 背景合同的回归测试。
 * [POS]: components 的登录页主题测试，约束 V3 入口页不混入工作区导航与旧伪技术装饰，锁住首屏节奏、八章顺序、首尾同源登录 CTA、无 Demo 入口、双主题、认证模式、CSS sticky + spacer、动效生命周期与液体折射边界。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'

import { LoginPageView, type LoginPageViewProps } from './login-page-view'

function renderLogin(theme: LoginPageViewProps['theme'], overrides: Partial<LoginPageViewProps> = {}) {
  const props: LoginPageViewProps = {
    email: '',
    feedback: null,
    authMethod: 'email',
    defaultAuthOpen: false,
    isSubmitting: false,
    mode: 'login',
    onAnonymousLogin: vi.fn(),
    onAuthMethodChange: vi.fn(),
    onEmailChange: vi.fn(),
    onGoogleLogin: vi.fn(),
    onModeChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onSubmit: vi.fn(),
    onToggleTheme: vi.fn(),
    password: '',
    theme,
    ...overrides,
  }

  return renderToStaticMarkup(
    <ThemeProvider>
      <LocaleProvider>
        <BackgroundAudioProvider>
          <MemoryRouter>
            <LoginPageView {...props} />
          </MemoryRouter>
        </BackgroundAudioProvider>
      </LocaleProvider>
    </ThemeProvider>,
  )
}

function readLoginSource() {
  return [
    './login-page-view.tsx',
    './login/auth-overlay.tsx',
    './login/auth-card.tsx',
    './login/login-entry-view.tsx',
  ].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n')
}

function readTraceMapSource() {
  return readFileSync(new URL('./login/login-trace-map.tsx', import.meta.url), 'utf8')
}

function readLiquidEffectSource() {
  return readFileSync(new URL('./ui/liquid-effect-animation.tsx', import.meta.url), 'utf8')
}

function readStorySectionsSource() {
  return readFileSync(new URL('./login/login-story-sections.tsx', import.meta.url), 'utf8')
}

function readStoryMotionSource() {
  return readFileSync(new URL('./login/scroll-story-motion.ts', import.meta.url), 'utf8')
}

function readTransitionSource() {
  return readFileSync(new URL('../styles/motion.css', import.meta.url), 'utf8')
}

function readThreeTypesSource() {
  return readFileSync(new URL('../types/threejs-components.d.ts', import.meta.url), 'utf8')
}

function countOccurrences(source: string, fragment: string) {
  return source.split(fragment).length - 1
}

describe('LoginPageView theme shell', () => {
  it('renders dark login as an entry page without workspace side navigation', () => {
    const markup = renderLogin('dark')
    const loginSource = readLoginSource()

    expect(markup).not.toContain('FORENSIC_ARCHIVE_V1')
    expect(markup).not.toContain('临床 AI 控制台')
    expect(markup).not.toContain('content_paste_search')
    expect(markup).not.toContain('folder_managed')
    expect(markup).not.toContain('analytics')
    expect(markup).not.toContain('CLINICAL ARCHIVE CONSOLE v3.0')
    expect(markup).not.toContain('login-clinical-backdrop')
    expect(markup).toContain('data-testid="login-trace-map"')
    expect(markup).toContain('/login/blue-tears-background-dark.png')
    expect(markup).not.toContain('/login/wind-field-background-light.png')
    expect(markup).not.toContain('/login/lighthouse-sea-chart-background.png')
    expect(markup).not.toContain('data-testid="login-trace-waypoint"')
    expect(markup).not.toContain('role="tooltip"')
    expect(markup).not.toContain('group-hover:opacity-100')
    expect(markup).toContain('治疗的每一步，都有迹可循。')
    expect(markup).not.toContain('data-testid="login-compass-overlay"')
    expect(markup).not.toContain('270°')
    expect(markup).not.toContain('060°')
    expect(markup).not.toContain('090°')
    expect(markup).not.toContain('320°')
    expect(markup).toContain('data-testid="login-privacy-note"')
    expect(markup).toContain('录入前，了解资料如何处理')
    expect(markup).toContain('data-testid="login-intro-eyebrow"')
    expect(markup).toContain('面向肿瘤患者与家属的全程管理工具')
    expect(markup).not.toContain('top-[42%]')
    expect(markup).not.toContain('一键登录')
    expect(markup).not.toContain('data-testid="login-submit-button"')
    expect(markup).not.toContain('data-testid="login-auth-overlay"')
    expect(markup).not.toContain('data-testid="login-auth-modal-card"')
    expect(markup).not.toContain('data-testid="login-auth-drawer"')
    expect(markup).not.toContain('data-state="collapsed"')
    expect(markup).not.toContain('data-testid="login-drawer-collapsed-tab"')
    expect(markup).not.toContain('data-testid="login-mobile-auth-overlay"')
    expect(markup).not.toContain('data-testid="login-mobile-auth-card"')
    expect(markup).not.toContain('data-testid="login-capability-rail"')
    expect(markup).toContain('data-testid="login-page-utility-controls"')
    expect(markup).toContain('data-testid="login-auth-cta"')
    expect(markup).toContain('class="whitespace-nowrap">登录</span>')
    expect(markup).toContain('min-h-[52px]')
    expect(markup).toContain('min-w-[156px]')
    expect(loginSource).not.toContain('min-h-[66px] w-full max-w-[340px]')
    expect(loginSource).not.toContain('gap-4 rounded-[14px] bg-[var(--ff-accent-primary)] px-8 text-[1.35rem]')
    expect(markup).not.toContain('进入身份访问')
    expect(markup).not.toContain('data-testid="login-beacon-mark"')
    expect(markup).not.toContain('等待凭证')
    expect(markup).not.toContain('填写邮箱与密码后可登录')
    expect(markup).not.toContain('快捷登录')
    expect(markup).not.toContain('记住我')
    expect(markup).toContain('>主题</button>')
    expect(markup).toContain('>音乐</span>')
    expect(markup).toContain('>语言</button>')
    expect(markup).toContain('>light_mode</span>')
    expect(markup).toContain('>g_translate</span>')
    expect(markup).not.toContain('>深色</button>')
  })

  it('keeps the intro access action as a plain login button after credentials are present', () => {
    const markup = renderLogin('dark', {
      email: 'doctor@example.com',
      password: 'encrypted-key',
    })

    expect(markup).toContain('登录')
    expect(markup).toContain('data-testid="login-auth-cta"')
    expect(markup).not.toContain('data-testid="login-submit-button"')
    expect(markup).not.toContain('凭证就绪')
    expect(markup).not.toContain('等待凭证')
  })

  it('removes the public Demo entry from the login page without opening the auth overlay', () => {
    const markup = renderLogin('dark')
    const loginSource = readLoginSource()

    expect(markup).not.toContain('data-testid="login-demo-cta"')
    expect(markup).not.toContain('href="/demo/record"')
    expect(markup).not.toContain('查看 Demo')
    expect(loginSource).not.toContain('IntroDemoCta')
    expect(markup).not.toContain('data-testid="login-auth-overlay"')
  })

  it('renders all eight scroll-story chapters in the fixed OpenSpec order', () => {
    const markup = renderLogin('dark')
    const chapterIds = [
      'story-hero',
      'story-problem',
      'story-intake',
      'story-timeline',
      'story-views',
      'story-labs',
      'story-boundary',
      'story-cta',
    ]

    const chapterIndexes = chapterIds.map((id) => markup.indexOf(`id="${id}"`))
    expect(chapterIndexes.every((index) => index >= 0)).toBe(true)
    expect(chapterIndexes).toEqual([...chapterIndexes].sort((left, right) => left - right))
    expect(markup).toContain('最多进行 3 轮澄清')
    expect(markup).toContain('最近两个相邻区间都上涨超过 20%')
    expect(markup).toContain('接收者只能阅读，不能修改记录')
  })

  it('preserves the intentional line breaks shared by scroll-story headings', () => {
    const markup = renderLogin('dark')
    const storySource = readStorySectionsSource()

    expect(markup).toContain('text-balance whitespace-pre-line')
    expect(storySource).toContain("'把散落的治疗史，\\n收回一条可追溯的线。'")
  })

  it('renders two login CTAs backed by one auth state and one AuthOverlay instance', () => {
    const closedMarkup = renderLogin('dark')
    const openMarkup = renderLogin('dark', { defaultAuthOpen: true })
    const loginSource = readLoginSource()

    expect(countOccurrences(closedMarkup, 'data-testid="login-auth-cta"')).toBe(2)
    expect(countOccurrences(openMarkup, 'data-testid="login-auth-cta"')).toBe(2)
    expect(countOccurrences(openMarkup, 'data-testid="login-auth-overlay"')).toBe(1)
    expect(countOccurrences(loginSource, '<AuthOverlay')).toBe(1)
    expect(loginSource).toContain('closingCta={<IntroAccessCta isOpen={isAuthOpen} locale={locale} onOpen={openAuth} />}')
  })

  it('keeps credential actions out of the initial narrow-screen markup', () => {
    const markup = renderLogin('dark')

    expect(markup).not.toContain('邮箱')
    expect(markup).not.toContain('密码')
    expect(markup).not.toContain('匿名会话')
    expect(markup).not.toContain('data-testid="login-auth-overlay"')
    expect(markup).not.toContain('data-testid="login-mobile-auth-overlay"')
  })

  it('renders light login on a pure surface without the dotted background class', () => {
    const markup = renderLogin('light')

    expect(markup).not.toContain('ff-light-login-bg')
    expect(markup).not.toContain('FORENSIC_ARCHIVE_SYSTEM_V3.0')
    expect(markup).not.toContain('ENCRYPTION_LEVEL')
    expect(markup).not.toContain('DATA_EXTRACTION_PROTOCOL')
    expect(markup).toContain('/login/wind-field-background-light.png')
    expect(markup).not.toContain('/login/blue-tears-background-dark.png')
    expect(markup).not.toContain('/login/lighthouse-sea-chart-background.png')
    expect(markup).toContain('data-testid="login-trace-map"')
    expect(markup).not.toContain('/login/anatomy-light.png')
    expect(markup).toContain('bg-[var(--ff-surface-base)]')
    expect(markup).not.toContain('bg-[#02080a]')
    expect(markup).toContain('集中整理检查、诊断、用药与治疗记录')
  })

  it('fills the browser viewport instead of keeping the old fixed-width canvas', () => {
    const markup = renderLogin('light')

    expect(markup).toContain('min-h-dvh')
    expect(markup).toContain('w-full')
    expect(markup).not.toContain('xl:h-dvh')
    expect(markup).not.toContain('xl:grid-cols-1')
    expect(markup).toContain('w-full overflow-x-clip')
    expect(markup).not.toContain('min-h-dvh w-full overflow-x-hidden font-')
    expect(markup).toContain('overflow-hidden px-7 pb-8 pt-24')
    expect(markup).not.toContain('xl:grid-cols-[minmax(0,1fr)_112px]')
    expect(markup).not.toContain('order-first')
    expect(markup).not.toContain('order-last')
    expect(markup).not.toContain('xl:grid-cols-[minmax(0,1fr)_minmax(440px,580px)]')
    expect(markup).not.toContain('xl:grid-cols-[minmax(0,1fr)_minmax(420px,680px)]')
    expect(markup).not.toContain('lg:grid-cols-[minmax(0,1fr)_minmax(420px,680px)]')
    expect(markup).not.toContain('max-w-[1510px]')
    expect(markup).not.toContain('rounded-[var(--ff-radius-lg)] border border-[var(--ff-border-default)]')
  })

  it('uses one auth overlay instead of a desktop drawer branch', () => {
    const source = readLoginSource()
    const markup = renderLogin('dark', { defaultAuthOpen: true })

    expect(source).toContain('function AuthOverlay')
    expect(source).toContain('data-testid="login-auth-overlay"')
    expect(source).toContain('fixed inset-0 z-[80]')
    expect(source).toContain('<AuthCard {...authCardProps} id="login-auth-card" />')
    expect(source).toContain('requestClose')
    expect(source).toContain('is-closing')
    expect(source).toContain('window.setTimeout')
    expect(markup).toContain('t-modal')
    expect(markup).toContain('is-open')
    expect(source).not.toContain('function AuthDrawer')
    expect(source).not.toContain('desktopGridClass')
    expect(source).not.toContain('data-testid="login-auth-drawer"')
    expect(source).not.toContain('data-testid="login-mobile-auth-overlay"')
    expect(source).not.toContain('data-testid="login-mobile-auth-card"')
    expect(source).not.toContain('data-testid="login-drawer-close"')
    expect(source).not.toContain('fixed inset-0 z-50')
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_minmax')
    expect(source).not.toContain('backdrop-blur-sm xl:hidden')
    expect(source).not.toContain('className="hidden h-full w-full xl:flex')
  })

  it('mounts the login scene into the shared route reveal and stagger motion layer', () => {
    const markup = renderLogin('dark')

    expect(markup).toContain('t-route-reveal')
    expect(markup).toContain('t-login-backdrop')
    expect(markup).toContain('data-testid="login-liquid-ripple"')
    expect(markup).toContain('data-testid="login-liquid-refraction-filter"')
    expect(markup).toContain('t-stagger')
    expect(markup).toContain('style="--t-order:0"')
    expect(markup).toContain('style="--t-order:4"')
    expect(markup).toContain('t-control-press')
  })

  it('keeps the WebGL ripple out of static render execution', () => {
    const loginSource = readLoginSource()
    const traceMapSource = readTraceMapSource()
    const liquidEffectSource = readLiquidEffectSource()
    const storySectionsSource = readStorySectionsSource()
    const threeTypesSource = readThreeTypesSource()
    const markup = renderLogin('dark')

    expect(traceMapSource).toContain('LiquidEffectAnimation')
    expect(traceMapSource).toContain('enabled={enabled}')
    expect(loginSource).toContain('<LoginTraceMap enabled={!prefersReducedMotion}')
    expect(traceMapSource).toContain('displacementScale={skin.displacementScale}')
    expect(traceMapSource).toContain('refraction')
    expect(traceMapSource).toContain("backdropOpacity: 'opacity-5'")
    expect(traceMapSource).toContain("liquidOpacity: 'opacity-100'")
    expect(traceMapSource).toContain('metalness: 0.06')
    expect(traceMapSource).toContain('roughness: 0.82')
    expect(traceMapSource).toContain('brightness(0.72) contrast(1.34) saturate(1.14)')
    expect(traceMapSource).toContain('backgroundColor="transparent"')
    expect(traceMapSource).toContain('metalness={skin.metalness}')
    expect(traceMapSource).toContain('roughness={skin.roughness}')
    expect(traceMapSource).toContain('visualFilter={skin.visualFilter}')
    expect(liquidEffectSource).toContain('requestAnimationFrame')
    expect(liquidEffectSource).toContain('pointermove')
    expect(liquidEffectSource).toContain('await runtime.app.loadImage(config.imageSrc)')
    expect(liquidEffectSource).toContain('liquidRuntimeRef.current = runtime')
    expect(liquidEffectSource).toContain('syncLiquidRuntime(runtime, latestConfigRef.current)')
    expect(liquidEffectSource).toContain('}, [enabled])')
    expect(countOccurrences(liquidEffectSource, 'createLiquidBackground(')).toBe(1)
    expect(liquidEffectSource).not.toContain("getContext('webgl")
    expect(liquidEffectSource).not.toContain("document.createElement('canvas')")
    expect(threeTypesSource).toContain('loadImage: (imageUrl: string) => Promise<void>')
    expect(countOccurrences(markup, 'data-testid="login-trace-map"')).toBe(1)
    expect(countOccurrences(markup, 'data-testid="login-liquid-ripple"')).toBe(1)
    expect(countOccurrences(traceMapSource, '<LiquidEffectAnimation')).toBe(1)
    expect(storySectionsSource).not.toContain('LiquidEffectAnimation')
    expect(storySectionsSource).not.toContain('threejs-components')
    expect(storySectionsSource).not.toContain('<canvas')
    expect(markup).toContain('data-testid="login-liquid-ripple"')
    expect(markup).toContain('data-testid="login-liquid-refraction-filter"')
    expect(markup).not.toContain('threejs-components')
    expect(markup).not.toContain('__liquidApp')
    expect(markup).not.toContain('cdn.jsdelivr.net')
    expect(markup).not.toContain('document.body.appendChild(script)')
    expect(markup).not.toContain('__refractionDemoApp')
    expect(markup).not.toContain('__refractionStageApp')
    expect(liquidEffectSource).not.toContain('cdn.jsdelivr.net')
    expect(liquidEffectSource).not.toContain('document.body.appendChild(script)')
    expect(liquidEffectSource).not.toContain('__refractionDemoApp')
    expect(liquidEffectSource).not.toContain('__refractionStageApp')
  })

  it('keeps GSAP and ScrollTrigger inside the client effect boundary', () => {
    const markup = renderLogin('dark')
    const motionSource = readStoryMotionSource()
    const effectIndex = motionSource.indexOf('useEffect(() => {')
    const gsapImportIndex = motionSource.indexOf("import('gsap')")
    const triggerImportIndex = motionSource.indexOf("import('gsap/ScrollTrigger')")
    const registerIndex = motionSource.indexOf('gsap.registerPlugin(ScrollTrigger)')

    expect(markup).not.toContain('gsap')
    expect(markup).not.toContain('ScrollTrigger')
    expect(motionSource).not.toMatch(/from ['"]gsap(?:\/ScrollTrigger)?['"]/)
    expect(effectIndex).toBeGreaterThan(-1)
    expect(gsapImportIndex).toBeGreaterThan(effectIndex)
    expect(triggerImportIndex).toBeGreaterThan(effectIndex)
    expect(registerIndex).toBeGreaterThan(triggerImportIndex)
    expect(motionSource).toContain('gsap.context(() => {')
    expect(motionSource).toContain('context?.revert()')
  })

  it('locks the OpenSpec ScrollTrigger mapping and linear scrub easing', () => {
    const motionSource = readStoryMotionSource()
    const frozenConfigs = [
      "end: 'top 60%', scrub: 0.3, start: 'top 80%'",
      "end: 'top 55%', scrub: 0.3, start: 'top 75%'",
      "end: 'top 50%', scrub: 0.3, start: 'top 70%'",
      "end: 'top 30%', scrub: 0.5, start: 'top 70%'",
      "end: 'bottom center'",
      "scrub: 0.5",
      "start: '80% center'",
      "end: 'center top', scrub: 1, start: 'top 30%'",
    ]

    frozenConfigs.forEach((config) => expect(motionSource).toContain(config))
    expect(countOccurrences(motionSource, "ease: 'none'")).toBeGreaterThanOrEqual(7)
  })

  it('uses CSS sticky plus a sibling spacer and preserves all content in reduced motion', () => {
    const storySource = readStorySectionsSource()
    const motionSource = readStoryMotionSource()
    const transitionSource = readTransitionSource()

    expect(storySource).toContain('className="story-sticky-panel')
    expect(storySource).toContain('className="story-scroll-spacer"')
    expect(storySource).toContain('id="story-views-exit"')
    expect(storySource.indexOf('className="story-scroll-spacer"')).toBeGreaterThan(storySource.indexOf('id="story-views-sticky"'))
    expect(motionSource).toContain("const viewsExit = one('#story-views-exit')")
    expect(motionSource).toContain('gsap.to(viewsExit')
    expect(motionSource).not.toContain('gsap.to(viewsFrame')
    expect(motionSource).not.toContain('pin:')
    expect(motionSource).not.toContain('ScrollSmoother')
    expect(motionSource).not.toContain('Lenis')
    expect(transitionSource).toContain("[data-scroll-story-mode='reduced'] .story-scroll-spacer")
    expect(transitionSource).toContain('display: none;')
    expect(transitionSource).toContain("[data-scroll-story-mode='reduced'] .story-view-stack")
    expect(transitionSource).toContain('flex-direction: column;')
    expect(transitionSource).toContain("[data-scroll-story-mode='reduced'] .story-view-stack > [data-story-view-panel]")
    expect(transitionSource).toContain('opacity: 1 !important;')
  })

  it('uses the same localized brand wordmark as inner pages', () => {
    const markup = renderLogin('dark')

    expect(markup).toContain('data-brand-wordmark="true"')
    expect(markup).not.toContain('data-brand-firefly-glow')
    expect(markup).toContain('data-brand-wordmark-scale="login"')
    expect(markup).toContain('知见')
    expect(markup).not.toContain('data-brand-subtitle="true"')
    expect(markup).not.toContain('临床 AI 工作台')
  })

  it('uses shared accordion and control motion inside the auth modal', () => {
    const markup = renderLogin('dark', { defaultAuthOpen: true })

    expect(markup).toContain('t-accordion')
    expect(markup).toContain('t-popover')
    expect(markup).toContain('t-control-press')
    expect(markup).not.toContain('t-tab-switch')
  })

  it('renders the auth overlay title and submit action from the active mode', () => {
    const loginMarkup = renderLogin('dark', { defaultAuthOpen: true, mode: 'login' })
    const signUpMarkup = renderLogin('dark', { defaultAuthOpen: true, mode: 'sign-up' })

    expect(loginMarkup).toContain('aria-label="登录"')
    expect(loginMarkup).toContain('data-testid="login-auth-card-title"')
    expect(loginMarkup).toContain('>登录</h2>')
    expect(loginMarkup).toContain('<span>登录</span>')
    expect(loginMarkup).not.toContain('登录并进入工作区')
    expect(loginMarkup).not.toContain('创建账户并发送验证邮件')
    expect(signUpMarkup).toContain('aria-label="注册"')
    expect(signUpMarkup).toContain('>注册</h2>')
    expect(signUpMarkup).toContain('创建账户并登录')
    expect(signUpMarkup).not.toContain('创建账户并发送验证邮件')
    expect(signUpMarkup).not.toContain('邮箱验证策略')
    expect(signUpMarkup).not.toContain('aria-label="登录"')
  })

  it('renders password reset as an email-only mode', () => {
    const markup = renderLogin('light', { defaultAuthOpen: true, mode: 'password-reset' })

    expect(markup).toContain('aria-label="重置密码"')
    expect(markup).toContain('>重置密码</h2>')
    expect(markup).toContain('发送重置邮件')
    expect(markup).toContain('邮箱')
    expect(markup).not.toContain('for="login-auth-card-password"')
    expect(markup).not.toContain('placeholder="访问密钥（区分大小写）"')
    expect(markup).not.toContain('data-testid="login-password-input"')
  })

  it('does not render fake remember-me, phone, or WeChat controls in the auth card', () => {
    const markup = renderLogin('dark', { defaultAuthOpen: true, mode: 'login' })

    expect(markup).not.toContain('记住我')
    expect(markup).not.toContain('data-testid="login-wechat-coming-soon"')
    expect(markup).not.toContain('data-testid="login-auth-method-tabs"')
    expect(markup).not.toContain('data-testid="login-phone-coming-soon"')
    expect(markup).not.toContain('aria-label="微信"')
    expect(markup).not.toContain('aria-label="微信敬请期待"')
    expect(markup).toContain('aria-label="Google"')
    expect(markup).not.toContain('使用 Google 继续')
    expect(markup).not.toContain('自动登录或注册')
    expect(markup).toContain('忘记密码？')
  })

  it('does not render phone auth UI while the phone adapter stays unused', () => {
    const markup = renderLogin('dark', {
      authMethod: 'phone',
      defaultAuthOpen: true,
    })

    expect(markup).not.toContain('data-testid="login-auth-method-tabs"')
    expect(markup).not.toContain('data-testid="login-phone-coming-soon"')
    expect(markup).not.toContain('data-testid="login-phone-input"')
    expect(markup).not.toContain('data-testid="login-phone-otp-input"')
    expect(markup).not.toContain('data-testid="login-phone-code-button"')
    expect(markup).toContain('data-testid="login-password-input"')
    expect(markup).toContain('忘记密码？')
  })

  it('keeps phone OTP cooldown and send states out of the login card', () => {
    const markup = renderLogin('light', {
      authMethod: 'phone',
      defaultAuthOpen: true,
    })

    expect(markup).not.toContain('data-testid="login-phone-coming-soon"')
    expect(markup).not.toContain('42 秒后重发')
    expect(markup).not.toContain('验证码已发送')
    expect(markup).not.toContain('data-testid="login-phone-code-button"')
  })

  it('renders Google without a WeChat control on the login card', () => {
    const markup = renderLogin('dark', { defaultAuthOpen: true })

    expect(markup).toContain('aria-label="Google"')
    expect(markup).not.toContain('data-testid="login-wechat-coming-soon"')
    expect(markup).not.toContain('aria-label="微信"')
    expect(markup).not.toContain('aria-label="微信敬请期待"')
  })

  it('keeps WeChat off the login card even when the provider env is present', () => {
    const markup = renderLogin('dark', { defaultAuthOpen: true })

    expect(markup).toContain('aria-label="Google"')
    expect(markup).not.toContain('data-testid="login-wechat-coming-soon"')
    expect(markup).not.toContain('aria-label="微信"')
    expect(markup).not.toContain('使用 Google 继续')
    expect(markup).not.toContain('自动登录或注册')
  })

  it('keeps the intro background clean without visible workflow waypoints', () => {
    const markup = renderLogin('dark')

    expect(markup).toContain('登录页主题海岸背景')
    expect(markup).not.toContain('data-testid="login-trace-waypoint"')
    expect(markup).not.toContain('login-trace-tooltip-chaos')
    expect(markup).not.toContain('login-trace-tooltip-organize')
    expect(markup).not.toContain('login-trace-tooltip-structured')
    expect(markup).not.toContain('login-trace-tooltip-traceable')
    expect(markup).not.toContain('非结构化来源')
    expect(markup).not.toContain('时间轴梳理')
    expect(markup).not.toContain('标准化记录')
    expect(markup).not.toContain('可审计路径')
    expect(markup).not.toContain('混乱')
  })

  it('keeps the trace map anchored after the intro layout is stable', () => {
    const markup = renderLogin('dark')
    const waypointCount = markup.split('data-testid="login-trace-waypoint"').length - 1
    const inactiveWaypointCount = markup.split('data-active="false"').length - 1

    expect(waypointCount).toBe(0)
    expect(inactiveWaypointCount).toBe(0)
    expect(markup).toContain('登录页主题海岸背景')
    expect(markup).toContain('absolute inset-0 select-none overflow-hidden')
    expect(markup).toContain('absolute inset-0 h-full w-full object-cover object-center opacity-5')
    expect(markup).toContain('absolute inset-0 h-full w-full touch-none pointer-events-auto opacity-100')
    expect(markup).not.toContain('pointer-events-none absolute inset-0 z-20 hidden xl:block')
    expect(markup).not.toContain('data-testid="login-compass-overlay"')
    expect(markup).not.toContain('stroke-dasharray="7 16"')
    expect(markup).not.toContain('270°')
    expect(markup).not.toContain('060°')
    expect(markup).not.toContain('090°')
    expect(markup).not.toContain('320°')
    expect(markup).not.toContain('先把症状、用药、检查和疗效放回同一条时间轴')
    expect(markup).not.toContain('治疗线、分期、方案、免疫组化和基因检测')
    expect(markup).not.toContain('data-testid="login-anatomy-backdrop"')
    expect(markup).not.toContain('object-contain lg:block')
    expect(markup).not.toContain('object-contain md:block')
    expect(markup).not.toContain('max-w-[430px]')
  })

  it('keeps theme, language and music controls in flow on small screens and fixed on large screens', () => {
    const markup = renderLogin('light')
    const loginSource = readLoginSource()
    const heroIndex = markup.indexOf('id="story-hero"')
    const heroCloseIndex = markup.indexOf('</section>', heroIndex)
    const utilityIndex = markup.indexOf('data-testid="login-page-utility-controls"')
    const ctaIndex = markup.indexOf('data-testid="login-auth-cta"')
    const securityIndex = markup.indexOf('data-testid="login-privacy-note"')
    const themeLabelIndex = markup.indexOf('>主题</button>')
    const languageLabelIndex = markup.indexOf('>语言</button>')
    const musicLabelIndex = markup.indexOf('>音乐</span>')
    const themeIconIndex = markup.indexOf('>dark_mode</span>')
    const languageIconIndex = markup.indexOf('>g_translate</span>')
    const musicIconIndex = markup.indexOf('>play_arrow</span>')

    expect(markup.indexOf('登录')).toBeGreaterThan(-1)
    expect(utilityIndex).toBeGreaterThan(-1)
    expect(utilityIndex).toBeGreaterThan(ctaIndex)
    expect(heroCloseIndex).toBeGreaterThan(heroIndex)
    expect(utilityIndex).toBeGreaterThan(heroCloseIndex)
    expect(markup).toContain('story-section t-route-reveal relative min-h-dvh min-w-0 overflow-hidden')
    expect(markup).toContain('data-story-utility-shell="global"')
    expect(markup).toContain('relative z-20 flex justify-center px-7 pb-8 md:px-14 lg:contents')
    expect(markup).toContain('t-stagger relative z-20 mt-6 flex w-full')
    expect(markup).toContain('lg:fixed lg:bottom-6 lg:left-auto lg:right-6')
    expect(markup).toContain('style="--t-order:4"')
    expect(loginSource).toContain('preserveScrollPosition(onToggleTheme)')
    expect(loginSource).toContain('preserveScrollPosition(toggleLocale)')
    expect(loginSource).toContain('window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))')
    expect(loginSource).not.toContain('className="t-stagger" style={{ \'--t-order\': 4 } as CSSProperties}')
    expect(markup).not.toContain('fixed bottom-4 left-4 right-4')
    expect(markup).not.toContain('data-testid="login-auth-overlay"')
    expect(markup).not.toContain('data-testid="login-auth-drawer"')
    expect(markup).not.toContain('data-testid="login-drawer-collapsed-tab"')
    expect(markup).not.toContain('data-testid="login-auth-modal-card"')
    expect(markup).not.toContain('data-testid="login-mobile-auth-card"')
    expect(markup).not.toContain('data-testid="login-mobile-auth-overlay"')
    expect(securityIndex).toBeGreaterThan(ctaIndex)
    expect(utilityIndex).toBeGreaterThan(securityIndex)
    expect(themeIconIndex).toBeGreaterThan(utilityIndex)
    expect(languageIconIndex).toBeGreaterThan(utilityIndex)
    expect(musicIconIndex).toBeGreaterThan(utilityIndex)
    expect(themeIconIndex).toBeLessThan(themeLabelIndex)
    expect(languageIconIndex).toBeLessThan(languageLabelIndex)
    expect(musicIconIndex).toBeLessThan(musicLabelIndex)
    expect(themeLabelIndex).toBeGreaterThan(utilityIndex)
    expect(languageLabelIndex).toBeGreaterThan(utilityIndex)
    expect(musicLabelIndex).toBeGreaterThan(utilityIndex)
    expect(themeLabelIndex).toBeLessThan(languageLabelIndex)
    expect(languageLabelIndex).toBeLessThan(musicLabelIndex)
    expect(musicIconIndex).toBeGreaterThan(languageLabelIndex)
    expect(markup).not.toContain('>浅色</button>')
    expect(markup).not.toContain('>中文</button>')
  })

  it('does not render the light login vertical watermark', () => {
    const markup = renderLogin('light')

    expect(markup).not.toContain('CONFIDENTIAL CLINICAL WORKFLOW ENVIRONMENT')
    expect(markup).not.toContain('AUTHENTICATION REQUIRED')
  })

  it('keeps the main entry surface free of circular glow masks', () => {
    const source = readTraceMapSource()
    const loginSource = readLoginSource()

    expect(source).not.toContain('radial-gradient')
    expect(source).not.toContain('circle_at_')
    expect(loginSource).not.toContain('shadow-[0_22px_50px_rgba(232,93,42,0.26)]')
  })
})
