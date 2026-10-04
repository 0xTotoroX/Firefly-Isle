/**
 * [INPUT]: 依赖 node:fs 的源码合同检查，依赖 react-dom/server 的静态渲染，依赖 MemoryRouter、ThemeProvider、LocaleProvider、BackgroundAudioProvider、LoginPageView 与 ClinicalTopBar。
 * [OUTPUT]: 对外提供背景音乐简洁歌单入口的可访问语义、窄屏可用顶栏、顶栏直接播放/暂停、悬停播放器与桥接区域回归测试。
 * [POS]: components 的背景音乐 UI 合同测试，约束登录页工具区与已登录壳层共用同一个音乐开关、窄屏可用顶栏、当前曲目、上一首/下一首入口、暂停文案、紧凑顶栏直接切换、hover 弹层触发与按钮到弹层的连续 hover 区域。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { LoginPageView, type LoginPageViewProps } from '@/components/login-page-view'
import { ClinicalTopBar } from '@/components/system/topbar'
import { copy, getCopy } from '@/lib/copy'
import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'

const source = readFileSync(new URL('./background-music-toggle.tsx', import.meta.url), 'utf8')
const transitionsSource = readFileSync(new URL('../styles/motion.css', import.meta.url), 'utf8')
const hoverPlayerClass = source.match(/className="([^"]+)"\n\s+data-testid="background-music-hover-player"/)?.[1]

function withProviders(children: ReactNode) {
  return renderToStaticMarkup(
    <ThemeProvider>
      <LocaleProvider>
        <BackgroundAudioProvider>{children}</BackgroundAudioProvider>
      </LocaleProvider>
    </ThemeProvider>,
  )
}

function renderLogin(theme: LoginPageViewProps['theme']) {
  return withProviders(
    <MemoryRouter>
      <LoginPageView
        authMethod="email"
        email=""
        feedback={null}
        isSubmitting={false}
        mode="login"
        onAnonymousLogin={vi.fn()}
        onAuthMethodChange={vi.fn()}
        onEmailChange={vi.fn()}
        onGoogleLogin={vi.fn()}
        onModeChange={vi.fn()}
        onPasswordChange={vi.fn()}
        onSubmit={vi.fn()}
        onToggleTheme={vi.fn()}
        password=""
        theme={theme}
      />
    </MemoryRouter>,
  )
}

describe('BackgroundMusicToggle shell placement', () => {
  it('labels paused audio as a simple resume action', () => {
    expect(getCopy(copy.backgroundAudio.aria.paused, 'zh')).toBe('背景音乐已暂停，点击继续播放')
    expect(copy.backgroundAudio.aria).not.toHaveProperty('off')
  })

  it('uses player-style play and pause icons instead of volume icons', () => {
    expect(source).toContain("blocked: 'play_arrow'")
    expect(source).toContain("paused: 'play_arrow'")
    expect(source).toContain("idle: 'pause'")
    expect(source).toContain("playing: 'pause'")
    expect(source).not.toContain("playing: 'volume_up'")
  })

  it('keeps the authenticated compact control as one direct play or pause button with hover player reveal', () => {
    expect(source).toContain("layout?: 'compact' | 'inline'")
    expect(source).toContain("if (layout === 'compact')")
    expect(source).toContain('data-background-music-layout="compact"')
    expect(source).toContain('onClick={() => void toggle()}')
    expect(source).toContain('onPointerEnter={() => setIsPlayerOpen(true)}')
    expect(source).toContain("window.addEventListener('pointermove', closeWhenPointerLeavesPlayer)")
    expect(source).toContain('rootRef.current')
    expect(source).toContain('bridgeRef.current')
    expect(source).toContain('panelRef.current')
    expect(source).toContain('data-testid="background-music-hover-bridge"')
    expect(source).toContain('top-[56px]')
    expect(source).toContain('data-testid="background-music-hover-player"')
    expect(hoverPlayerClass).toContain('t-audio-popover')
    expect(hoverPlayerClass).toContain('bg-[color:color-mix(in_srgb,var(--ff-surface-panel)_54%,transparent)]')
    expect(hoverPlayerClass).toContain('supports-[backdrop-filter]:bg-[color:color-mix(in_srgb,var(--ff-surface-panel)_44%,transparent)]')
    expect(hoverPlayerClass).not.toMatch(/\bopacity-/)
    expect(transitionsSource).toContain('@keyframes t-audio-pop-in')
    expect(transitionsSource).toContain('.t-audio-popover')
    expect(source).toContain('grid grid-cols-2 gap-2')
    expect(source).not.toContain('grid grid-cols-3 gap-2')
    expect(source).not.toContain('setIsPanelOpen')
    expect(source).not.toContain('openControls')
  })

  it('renders in the login utility controls with text and accessible state', () => {
    const markup = renderLogin('dark')
    const utilityIndex = markup.indexOf('data-testid="login-page-utility-controls"')
    const musicIndex = markup.indexOf('data-testid="background-music-toggle"')

    expect(utilityIndex).toBeGreaterThan(-1)
    expect(musicIndex).toBeGreaterThan(utilityIndex)
    expect(markup).toContain('aria-label="背景音乐已暂停，点击继续播放"')
    expect(markup).toContain('data-audio-status="paused"')
    expect(markup).toContain('data-testid="background-music-current-track"')
    expect(markup).toContain('Nagisa Sakano Shitano Wakare')
    expect(markup).toContain('aria-label="上一首背景音乐"')
    expect(markup).toContain('aria-label="下一首背景音乐"')
    expect(markup).toContain('>音乐</span>')
  })

  it('renders in the authenticated top bar as an icon-only direct toggle', () => {
    const markup = withProviders(<ClinicalTopBar theme="light" title="病程整理台" withRail />)
    const musicMarkup = markup.slice(
      markup.indexOf('data-background-music-layout="compact"'),
      markup.indexOf('aria-controls="origin-story-paper"'),
    )

    expect(markup).toContain('left-0 right-0 md:left-[var(--ff-sidebar-offset)]')
    expect(musicMarkup).toContain('data-testid="background-music-toggle"')
    expect(musicMarkup).toContain('aria-label="背景音乐已暂停，点击继续播放"')
    expect(musicMarkup).toContain('aria-pressed="false"')
    expect(musicMarkup).toContain('data-audio-status="paused"')
    expect(musicMarkup).toContain('data-background-music-layout="compact"')
    expect(musicMarkup).not.toContain('打开背景音乐控制')
    expect(musicMarkup).not.toContain('aria-haspopup="dialog"')
    expect(musicMarkup).toContain('aria-expanded="false"')
    expect(musicMarkup).not.toContain('data-background-music-layout="popover"')
    expect(musicMarkup).toContain('>play_arrow</span>')
    expect(musicMarkup).not.toContain('>音乐</span>')
    expect(musicMarkup).not.toContain('data-testid="background-music-current-track"')
    expect(musicMarkup).not.toContain('Nagisa Sakano Shitano Wakare')
    expect(musicMarkup).not.toContain('aria-label="上一首背景音乐"')
    expect(musicMarkup).not.toContain('aria-label="下一首背景音乐"')
  })

  it('keeps the authenticated top bar usable in very narrow browser widths', () => {
    const markup = withProviders(<ClinicalTopBar theme="dark" title="病程整理台" withRail />)

    expect(markup).toContain('items-center justify-start gap-2 px-3')
    expect(markup).toContain('sm:justify-between sm:gap-0')
    expect(markup).toContain('sm:px-5 md:px-8')
    expect(markup).toContain('flex min-w-0 items-center gap-2 pr-1')
    expect(markup).toContain('sm:flex-1')
    expect(markup).toContain('text-base font-black leading-tight tracking-normal')
    expect(markup).toContain('max-[360px]:sr-only')
    expect(markup).toContain('relative flex shrink-0 items-center gap-1 sm:gap-3')
    expect(markup).toContain('h-10 w-10')
    expect(markup).toContain('sm:h-11 sm:w-11')
  })
})
