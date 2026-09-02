/**
 * [INPUT]: 依赖 react 的 CSSProperties/PropsWithChildren，依赖 @/lib/theme/tokens 的过渡类与侧栏宽度合同。
 * [OUTPUT]: 对外提供 SidebarShell、TopBarShell、MainShell、PanelSurface、SectionSurface、ActionSurface 与 SurfaceTone 类型，Panel/Section/Action 支持 style passthrough。
 * [POS]: src/components/system 的壳层与表面基元文件，为页面与 app-shell 提供统一结构与 surface contract。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { CSSProperties, PropsWithChildren } from 'react'

import { themeTransitionClass } from '@/lib/theme/tokens'
import { cn } from '@/lib/utils'
import type { Theme } from '@/lib/theme'

type SurfaceTone = 'accent' | 'base' | 'inset' | 'panel' | 'soft' | 'warning'

type ThemedProps = PropsWithChildren<{
  className?: string
  style?: CSSProperties
  theme: Theme
}>

function sidebarSurface(_theme: Theme) {
  return cn(
    'bg-[var(--ff-surface-sidebar)] text-[var(--ff-text-primary)]',
  )
}

function panelSurface(_theme: Theme, tone: SurfaceTone) {
  const surfaceByTone: Record<SurfaceTone, string> = {
    accent: 'bg-[var(--ff-surface-accent)]',
    base: 'bg-[var(--ff-surface-base)]',
    inset: 'bg-[var(--ff-surface-inset)]',
    panel: 'bg-[var(--ff-surface-panel)]',
    soft: 'bg-[var(--ff-surface-soft)]',
    warning: 'bg-[var(--ff-surface-warning)]',
  }

  return cn(
    'rounded-[var(--ff-radius-md)] text-[var(--ff-text-primary)]',
    surfaceByTone[tone],
  )
}

export function SidebarShell({ children, className, style, theme }: ThemedProps) {
  return (
    <aside className={cn('shrink-0', themeTransitionClass, sidebarSurface(theme), className)} style={style}>
      {children}
    </aside>
  )
}

export function TopBarShell({ children, className }: ThemedProps) {
  return (
    <header
      className={cn(
        themeTransitionClass,
        'bg-[var(--ff-surface-shell)] text-[var(--ff-text-primary)]',
        className,
      )}
    >
      {children}
    </header>
  )
}

export function MainShell({ children, className, theme }: ThemedProps) {
  return (
    <main
      className={cn(
        themeTransitionClass,
        theme === 'dark'
          ? 'bg-[var(--ff-surface-shell)] text-[var(--ff-text-primary)]'
          : 'bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]',
        className,
      )}
    >
      {children}
    </main>
  )
}

export function PanelSurface({ children, className, style, theme, tone = 'panel' }: ThemedProps & { tone?: SurfaceTone }) {
  return (
    <div className={cn(themeTransitionClass, panelSurface(theme, tone), className)} style={style}>
      {children}
    </div>
  )
}

export function SectionSurface({ children, className, style, theme, tone = 'panel' }: ThemedProps & { tone?: SurfaceTone }) {
  return (
    <section className={cn(themeTransitionClass, panelSurface(theme, tone), className)} style={style}>
      {children}
    </section>
  )
}

export function ActionSurface({ children, className, style, theme, tone = 'panel' }: ThemedProps & { tone?: SurfaceTone }) {
  return (
    <div className={cn(themeTransitionClass, panelSurface(theme, tone), className)} style={style}>
      {children}
    </div>
  )
}

export type { SurfaceTone }
