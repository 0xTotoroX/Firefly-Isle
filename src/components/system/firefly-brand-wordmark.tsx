/**
 * [INPUT]: 依赖 react 的 CSSProperties 类型、@/lib/locale 的 Locale 与 @/lib/utils 的 cn。
 * [OUTPUT]: 对外提供 FireflyBrandWordmark 组件，统一紧凑侧栏水平字标、登录页艺术字标、萤字微光、渐隐横线、登录页收敛尺寸与可选副标题。
 * [POS]: src/components/system 的品牌字标基元，被 sidebar-nav 与 login-entry-view 复用，保证内页工具栏与登录页品牌设计同源但按场景分化字体重心。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { type CSSProperties } from 'react'

import type { Locale } from '@/lib/locale'
import { cn } from '@/lib/utils'

type FireflyBrandWordmarkScale = 'sidebar' | 'login'

type FireflyBrandWordmarkProps = {
  className?: string
  locale: Locale
  scale?: FireflyBrandWordmarkScale
  subtitle?: string
}

const chineseBrandWordmarkStyle = {
  fontFamily: 'var(--ff-font-display)',
  lineHeight: '1',
} satisfies CSSProperties

const englishSidebarBrandWordmarkStyle = {
  fontFamily: 'var(--ff-font-display)',
  fontWeight: 800,
  lineHeight: '1',
} satisfies CSSProperties

const englishLoginBrandWordmarkStyle = {
  fontFamily: '"Snell Roundhand", "Savoye LET", "Apple Chancery", cursive',
  fontWeight: 700,
  lineHeight: '1.08',
  paddingBottom: '0.18em',
  transform: 'translateY(2px)',
} satisfies CSSProperties

const illuminatedBrandTextStyle = {
  color: 'var(--ff-accent-primary)',
  textShadow: '.35px 0 var(--ff-accent-primary), 0 0 12px rgba(232,93,42,0.28)',
} satisfies CSSProperties

const fireflyGlyphStyle = {
  ...illuminatedBrandTextStyle,
  display: 'inline-block',
  isolation: 'isolate',
  position: 'relative',
} satisfies CSSProperties

const fireflyGlyphAuraStyle = {
  background: 'radial-gradient(circle at 58% 50%, color-mix(in srgb, var(--ff-accent-primary) 44%, transparent) 0%, rgba(255,201,116,0.2) 34%, transparent 68%)',
  borderRadius: '999px',
  filter: 'blur(4px)',
  inset: '-0.12em -0.08em -0.08em -0.1em',
  opacity: 0.62,
  position: 'absolute',
  transform: 'translateX(0.03em)',
  zIndex: -1,
} satisfies CSSProperties

function getTitleClass(locale: Locale, scale: FireflyBrandWordmarkScale) {
  if (scale === 'login') {
    return locale === 'zh'
      ? 'overflow-visible whitespace-nowrap text-[clamp(2.15rem,5.2vw,3rem)] font-light leading-none tracking-[0.06em] md:text-[clamp(2.45rem,3.1vw,3.4rem)]'
      : 'overflow-visible whitespace-nowrap text-[clamp(2rem,4.4vw,2.75rem)] font-bold tracking-normal md:text-[clamp(2.25rem,2.8vw,3.1rem)]'
  }

  return locale === 'zh'
    ? 'overflow-visible whitespace-nowrap text-[31px] font-light leading-none tracking-[0.03em]'
    : 'overflow-visible whitespace-nowrap text-[25px] font-black leading-none tracking-normal'
}

function getEnglishBrandWordmarkStyle(scale: FireflyBrandWordmarkScale) {
  return scale === 'login' ? englishLoginBrandWordmarkStyle : englishSidebarBrandWordmarkStyle
}

function renderWordmark(locale: Locale, scale: FireflyBrandWordmarkScale) {
  if (locale === 'zh') {
    return (
      <>
        一页
        <span data-brand-firefly-glow="true" style={fireflyGlyphStyle}>
          <span aria-hidden="true" style={fireflyGlyphAuraStyle} />
          萤
        </span>
        屿
      </>
    )
  }

  if (scale === 'sidebar') {
    return (
      <>
        <span data-brand-firefly-glow="true" style={fireflyGlyphStyle}>
          <span aria-hidden="true" style={fireflyGlyphAuraStyle} />
          Firefly
        </span>{' '}
        Isle
      </>
    )
  }

  return (
    <>
      <span data-brand-firefly-glow="true" style={fireflyGlyphStyle}>
        <span aria-hidden="true" style={fireflyGlyphAuraStyle} />
        Firefly
      </span>{' '}
      Isle
    </>
  )
}

export function FireflyBrandWordmark({
  className,
  locale,
  scale = 'sidebar',
  subtitle,
}: FireflyBrandWordmarkProps) {
  const isChinese = locale === 'zh'

  return (
    <span
      className={cn('relative min-w-0 overflow-visible pl-1', scale === 'login' ? 'block' : 'max-w-[134px]', className)}
      data-brand-art-wordmark="true"
      data-brand-wordmark="true"
      data-brand-wordmark-scale={scale}
    >
      <span
        className={cn('block max-w-full text-[var(--ff-text-primary)]', getTitleClass(locale, scale))}
        style={isChinese ? chineseBrandWordmarkStyle : getEnglishBrandWordmarkStyle(scale)}
      >
        {renderWordmark(locale, scale)}
      </span>
      <span className={cn('mt-1.5 block h-px max-w-full bg-[linear-gradient(90deg,var(--ff-accent-primary),transparent)]', scale === 'login' ? 'w-[min(22rem,82%)]' : 'w-[92px]')} />
      {subtitle ? (
        <span
          className={cn(
            'mt-2 block truncate font-[var(--ff-font-display)] font-semibold tracking-normal text-[var(--ff-text-secondary)]',
            scale === 'login' ? 'text-xl md:text-2xl' : 'text-base',
          )}
          data-brand-subtitle="true"
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  )
}
