/**
 * [INPUT]: 依赖 react 的状态、ref 与 pointer/keyboard 事件，依赖 react-router-dom 的 Link/useLocation，依赖 BrandMark、BrandWordmark 与 SidebarShell，依赖 @/lib/theme、locale、可选真实病历/统计 href 与紧凑可拖拽侧栏 token。
 * [OUTPUT]: 对外提供 ArchiveSideNav 组件与 ArchiveSideNavProps 类型；宽度持久化失败时保留内存交互，短视口允许导航独立滚动。
 * [POS]: src/components/system 的共享侧栏导航组件，统一 dark/light 的紧凑桌面默认展开、移动端默认收起、真实病历/统计入口、显式公开 Demo 入口、固定账户设置入口、无当前患者时转到总览病历列表，工作区明确为空时保留“先提取”提示、独立品牌 mark/中英文 display token 侧栏字标、边线胶囊折叠、44px 恢复热区、左缘渐进拉出、拖拽缩放到隐藏、阈值 icon-only、active 细左标与低强度行面、Google Translate 与临床笔记图标、匿名/非匿名身份图标、无下拉误导的偏好控制与会话出口。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useDemoSession, useProductPath } from '@/lib/demo-session'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { BrandWordmark } from '@/components/system/brand-wordmark'
import { BrandMark } from '@/components/system/brand-mark'
import { SidebarShell } from '@/components/system/surfaces'
import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import {
  sidebarDefaultWidth,
  sidebarLabelHideWidth,
  sidebarMaxWidth,
  sidebarMinWidth,
  sidebarWidthClass,
  themeTransitionClass,
} from '@/lib/theme/tokens'
import { cn } from '@/lib/utils'

const SIDEBAR_EXPANDED_WIDTH_STORAGE_KEY = 'firefly-sidebar-expanded-width-v8'
const POINTER_DRAG_THRESHOLD = 4
const HIDDEN_EDGE_HIT_WIDTH = 52
const HIDDEN_SWIPE_VERTICAL_TOLERANCE = 44
const MOBILE_SIDEBAR_QUERY = '(max-width: 767px)'
type HiddenRevealId = number | 'mouse'
type HiddenRevealDrag = {
  didReveal: boolean
  id: HiddenRevealId
  width: number
  x: number
  y: number
}

function clampSidebarWidth(width: number) {
  return Math.min(sidebarMaxWidth, Math.max(sidebarMinWidth, Math.round(width)))
}

function normalizeExpandedWidth(width: number) {
  const clampedWidth = clampSidebarWidth(width)

  return clampedWidth >= sidebarDefaultWidth ? clampedWidth : sidebarDefaultWidth
}

function readStoredExpandedWidth() {
  if (typeof window === 'undefined') {
    return sidebarDefaultWidth
  }

  try {
    const stored = Number(window.localStorage.getItem(SIDEBAR_EXPANDED_WIDTH_STORAGE_KEY))
    return Number.isFinite(stored) ? normalizeExpandedWidth(stored) : sidebarDefaultWidth
  } catch {
    return sidebarDefaultWidth
  }
}

function writeStoredExpandedWidth(width: number) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SIDEBAR_EXPANDED_WIDTH_STORAGE_KEY, String(width))
  } catch {
    // Width is an optional preference; resizing still works without persistent storage.
  }
}

function shouldStartHidden() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(MOBILE_SIDEBAR_QUERY).matches
}

export type ArchiveSideNavProps = {
  analyticsHref?: string | null
  dark: boolean
  isSigningOut?: boolean
  onSignOut?: () => void
  recordHref?: string | null
  userIsAnonymous?: boolean
  userLabel?: string
}

type SidebarNavItem = {
  href?: string
  icon: string
  labelKey: 'dashboard' | 'extract' | 'record' | 'analytics' | 'models' | 'donate' | 'settings'
}

function isActive(pathname: string, href: string) {
  if (href.startsWith('/record/') || href === '/demo/record') {
    return pathname.startsWith('/record') || pathname === '/demo/record'
  }

  if (href.startsWith('/analytics/') || href === '/demo/analytics') {
    return pathname.startsWith('/analytics') || pathname === '/demo/analytics'
  }

  return pathname === href
}

export function ArchiveSideNav({ analyticsHref, dark, isSigningOut = false, onSignOut, recordHref, userIsAnonymous = false, userLabel }: ArchiveSideNavProps) {
  const location = useLocation()
  const demo = useDemoSession()
  const productPath = useProductPath()
  const { locale } = useLocale()
  const [expandedWidth, setExpandedWidth] = useState(() => demo ? sidebarDefaultWidth : readStoredExpandedWidth())
  const [hidden, setHidden] = useState(shouldStartHidden)
  const [width, setWidth] = useState(() => demo ? sidebarDefaultWidth : readStoredExpandedWidth())
  const dragMovedRef = useRef(false)
  const hiddenRevealDragRef = useRef<HiddenRevealDrag | null>(null)
  const resolvedUserLabel = userLabel ?? getCopy(copy.shell.nav.pendingAccess, locale)
  const userIcon = userIsAnonymous ? 'theater_comedy' : 'person'
  const themeName = dark ? 'dark' : 'light'
  const compact = width <= sidebarLabelHideWidth
  const sidebarStyle = useMemo(() => ({ width: `${width}px` }), [width])
  const navItems = useMemo<SidebarNavItem[]>(
    () => [
      { icon: 'space_dashboard', href: '/dashboard', labelKey: 'dashboard' },
      { icon: 'my_location', href: '/app', labelKey: 'extract' },
      { icon: 'clinical_notes', href: recordHref === undefined ? '/dashboard#records' : recordHref ?? undefined, labelKey: 'record' },
      { icon: 'bar_chart', href: analyticsHref === undefined ? '/dashboard#records' : analyticsHref ?? undefined, labelKey: 'analytics' },
      { icon: 'tune', href: '/models', labelKey: 'models' },
      { icon: 'settings', href: '/settings', labelKey: 'settings' },
    ],
    [analyticsHref, recordHref],
  )

  useEffect(() => {
    document.documentElement.style.setProperty('--ff-sidebar-width', `${width}px`)
    document.documentElement.style.setProperty('--ff-sidebar-offset', hidden ? '0px' : `${width}px`)
  }, [hidden, width])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const media = window.matchMedia(MOBILE_SIDEBAR_QUERY)
    const hideOnMobile = (matches: boolean) => {
      if (matches) {
        setHidden(true)
      }
    }
    const handleChange = (event: MediaQueryListEvent) => hideOnMobile(event.matches)

    hideOnMobile(media.matches)
    media.addEventListener('change', handleChange)

    return () => {
      media.removeEventListener('change', handleChange)
    }
  }, [])

  const rememberExpandedWidth = (nextWidth: number) => {
    if (nextWidth >= sidebarDefaultWidth) {
      const normalizedWidth = normalizeExpandedWidth(nextWidth)

      setExpandedWidth(normalizedWidth)
      if (!demo) writeStoredExpandedWidth(normalizedWidth)
    }
  }

  const restoreSidebar = () => {
    const nextWidth = normalizeExpandedWidth(expandedWidth)

    setHidden(false)
    setWidth(nextWidth)
    setExpandedWidth(nextWidth)
  }

  const startHiddenReveal = (id: HiddenRevealId, clientX: number, clientY: number) => {
    hiddenRevealDragRef.current = {
      didReveal: false,
      id,
      width: sidebarMinWidth,
      x: clientX,
      y: clientY,
    }
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  const clearHiddenReveal = () => {
    hiddenRevealDragRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  const finishHiddenReveal = (id: HiddenRevealId) => {
    const dragState = hiddenRevealDragRef.current

    if (!dragState || dragState.id !== id) {
      return
    }

    clearHiddenReveal()

    if (!dragState.didReveal) {
      return
    }

    const nextWidth = clampSidebarWidth(dragState.width)

    setHidden(false)
    setWidth(nextWidth)

    if (nextWidth >= sidebarDefaultWidth) {
      const normalizedWidth = normalizeExpandedWidth(nextWidth)

      setExpandedWidth(normalizedWidth)
      if (!demo) writeStoredExpandedWidth(normalizedWidth)
    }
  }

  const trackHiddenReveal = (clientX: number, clientY: number, id: HiddenRevealId) => {
    const dragState = hiddenRevealDragRef.current

    if (!dragState || dragState.id !== id) {
      return false
    }

    const deltaX = clientX - dragState.x
    const deltaY = clientY - dragState.y

    if (!dragState.didReveal && Math.abs(deltaY) > HIDDEN_SWIPE_VERTICAL_TOLERANCE && Math.abs(deltaY) > Math.abs(deltaX)) {
      clearHiddenReveal()
      return true
    }

    if (deltaX <= POINTER_DRAG_THRESHOLD) {
      return false
    }

    const nextWidth = clampSidebarWidth(Math.max(sidebarMinWidth, deltaX))

    dragState.didReveal = true
    dragState.width = nextWidth
    setHidden(false)
    setWidth(nextWidth)

    if (nextWidth >= sidebarDefaultWidth) {
      setExpandedWidth(nextWidth)
    }

    return true
  }

  const startHiddenSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (!hidden || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }

    const pointerId = event.pointerId

    startHiddenReveal(pointerId, event.clientX, event.clientY)

    const trackPointerReveal = (moveEvent: globalThis.PointerEvent) => {
      trackHiddenReveal(moveEvent.clientX, moveEvent.clientY, pointerId)
    }
    const stopPointerReveal = () => {
      window.removeEventListener('pointermove', trackPointerReveal)
      window.removeEventListener('pointerup', stopPointerReveal)
      window.removeEventListener('pointercancel', stopPointerReveal)
      finishHiddenReveal(pointerId)
    }

    window.addEventListener('pointermove', trackPointerReveal)
    window.addEventListener('pointerup', stopPointerReveal)
    window.addEventListener('pointercancel', stopPointerReveal)
  }

  const startHiddenMouseSwipe = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!hidden || event.button !== 0) {
      return
    }

    startHiddenReveal('mouse', event.clientX, event.clientY)

    const stopMouseSwipe = () => {
      window.removeEventListener('mousemove', trackMouseSwipe)
      window.removeEventListener('mouseup', stopMouseSwipe)
      finishHiddenReveal('mouse')
    }
    const trackMouseSwipe = (moveEvent: globalThis.MouseEvent) => {
      if (!hiddenRevealDragRef.current) {
        stopMouseSwipe()
        return
      }

      trackHiddenReveal(moveEvent.clientX, moveEvent.clientY, 'mouse')
    }

    window.addEventListener('mousemove', trackMouseSwipe)
    window.addEventListener('mouseup', stopMouseSwipe)
  }

  const cycleSidebar = () => {
    if (hidden) {
      restoreSidebar()
      return
    }

    if (compact) {
      setHidden(true)
      return
    }

    rememberExpandedWidth(width)
    setWidth(sidebarMinWidth)
  }

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = width
    dragMovedRef.current = false

    const resize = (moveEvent: globalThis.PointerEvent) => {
      const delta = moveEvent.clientX - startX
      const rawWidth = Math.round(startWidth + delta)
      const nextWidth = clampSidebarWidth(rawWidth)

      if (Math.abs(delta) > POINTER_DRAG_THRESHOLD) {
        dragMovedRef.current = true
      }

      if (rawWidth <= HIDDEN_EDGE_HIT_WIDTH) {
        setHidden(true)
        setWidth(sidebarMinWidth)
        return
      }

      setHidden(false)
      setWidth(nextWidth)
      rememberExpandedWidth(nextWidth)
    }

    const stopResize = (upEvent: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', resize)
      window.removeEventListener('pointerup', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      if (!dragMovedRef.current && Math.abs(upEvent.clientX - startX) <= POINTER_DRAG_THRESHOLD) {
        cycleSidebar()
        return
      }

      if (Math.round(startWidth + upEvent.clientX - startX) <= HIDDEN_EDGE_HIT_WIDTH) {
        setHidden(true)
        setWidth(sidebarMinWidth)
      }
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', resize)
    window.addEventListener('pointerup', stopResize)
  }

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      cycleSidebar()
      return
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? -12 : 12
    const nextWidth = clampSidebarWidth(width + direction)

    setHidden(false)
    setWidth(nextWidth)
    rememberExpandedWidth(nextWidth)
  }

  const renderLabel = (label: string, className?: string) =>
    compact ? null : <span className={`${cn('truncate tracking-normal', className)} font-[var(--ff-font-display)]`}>{label}</span>
  const renderBrandTitle = () => (compact ? null : <BrandWordmark locale={locale} />)

  const iconOnlyTooltip = (label: string) =>
    compact ? (
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 rounded-[var(--ff-radius-sm)] bg-[var(--ff-text-primary)] px-2 py-1 font-[var(--ff-font-mono)] text-[10px] text-[var(--ff-surface-base)] shadow-sm group-hover:block">
        {label}
      </span>
    ) : null

  return (
    <>
      {hidden ? (
        <div
          className="fixed left-0 top-0 z-[60] h-screen w-10 touch-none"
          onPointerDown={startHiddenSwipe}
          onMouseDown={startHiddenMouseSwipe}
        >
          <button
            aria-label={locale === 'zh' ? '显示侧边栏' : 'Show sidebar'}
            className="group absolute left-0 top-1/2 flex h-20 w-11 -translate-y-1/2 items-center justify-start rounded-r-[var(--ff-radius-md)] text-[var(--ff-accent-text)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ff-accent-primary)]"
            onClick={restoreSidebar}
            title={locale === 'zh' ? '显示侧边栏，或从左向右滑出' : 'Show sidebar, or swipe right from the left edge'}
            type="button"
          >
            <span className="flex h-20 w-[14px] items-center justify-center rounded-r-[var(--ff-radius-md)] border border-l-0 border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] shadow-[0_0_22px_rgba(0,0,0,0.32)] transition-[width,border-color,background-color] duration-200 group-hover:w-[18px] group-hover:border-[var(--ff-accent-primary)]">
              <span className="h-10 w-[3px] rounded-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)]" />
            </span>
          </button>
        </div>
      ) : null}

      {hidden ? null : (
        <SidebarShell
          className={cn(
            'fixed left-0 top-0 z-50 flex h-dvh flex-col justify-between overflow-visible pb-[calc(1rem+var(--ff-safe-bottom))] pt-[calc(1rem+var(--ff-safe-top))] transition-[width,background-color,border-color] duration-200 ease-out',
            sidebarWidthClass,
            compact ? 'items-center px-2' : 'px-3',
          )}
          style={sidebarStyle}
          theme={themeName}
        >
          <div className={cn('flex min-h-0 w-full flex-1 flex-col gap-3', compact ? 'items-center' : 'items-stretch')}>
            <div className={cn('flex w-full shrink-0 items-center', compact ? 'justify-center' : 'min-h-[88px] justify-start pb-2 pt-1')}>
              <Link
                aria-label={getCopy(copy.shell.brand.lightTitle, locale)}
                className={cn(
                  'group flex min-w-0 rounded-[var(--ff-radius-md)] text-[var(--ff-text-primary)] outline-none transition-[color] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ff-accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ff-surface-sidebar)]',
                  compact ? 'items-center justify-center' : 'items-end justify-start gap-1.5',
                )}
                to={productPath('/app')}
              >
                <BrandMark className={compact ? undefined : 'h-[52px] w-[52px]'} size={compact ? 'rail' : 'large'} />
                {renderBrandTitle()}
              </Link>
            </div>

            <nav aria-label={locale === 'zh' ? '主导航' : 'Main navigation'} className={cn('flex min-h-0 w-full flex-col gap-1 [@media(max-height:700px)]:overflow-y-auto [@media(max-height:700px)]:overscroll-contain', compact ? 'items-center' : 'items-stretch')}>
              {!demo ? <a className="flex min-h-[44px] items-center gap-3 px-4 text-sm font-semibold text-[var(--ff-text-secondary)]" href="/demo"><span aria-hidden="true" className="material-symbols-outlined">play_circle</span>{compact ? null : (locale === 'zh' ? '体验演示' : 'Try demo')}</a> : null}
              {navItems.map((item) => {
                const active = item.href ? isActive(location.pathname.replace(/^\/demo(?=\/)/, ''), item.href.replace(/^\/demo(?=\/)/, '')) : false
                const label = getCopy(copy.shell.nav[item.labelKey], locale)
                const unavailableHint = item.href ? null : getCopy(copy.shell.nav.extractFirst, locale)
                const navigationLabel = unavailableHint ? `${label}：${unavailableHint}` : label
                const demoTarget = item.href?.startsWith('/demo/') ?? false
                const itemClassName = cn(
                  'group relative flex h-[50px] min-w-0 shrink-0 items-center overflow-visible rounded-[var(--ff-radius-sm)] text-[var(--ff-text-secondary)]',
                  themeTransitionClass,
                  compact ? 'w-12 justify-center' : 'w-full justify-start gap-3 px-4',
                  unavailableHint
                    ? 'cursor-not-allowed text-[var(--ff-text-muted)] opacity-65'
                    : active
                      ? 'bg-[color-mix(in_srgb,var(--ff-accent-primary)_8%,transparent)] text-[var(--ff-accent-text)]'
                      : 'hover:bg-[var(--ff-surface-panel)] hover:text-[var(--ff-text-primary)]',
                )
                const itemContent = (
                  <>
                    <span className={cn('material-symbols-outlined shrink-0 text-[25px]', active ? 'text-[var(--ff-accent-text)]' : '')}>
                      {item.icon}
                    </span>
                    {renderLabel(label, cn('text-[16px] font-semibold leading-none', active ? 'text-[var(--ff-accent-text)]' : ''))}
                    {demoTarget && !compact ? (
                      <span className="ml-auto rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-muted)] px-1.5 py-0.5 font-[var(--ff-font-mono)] text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ff-text-muted)]">
                        Demo
                      </span>
                    ) : null}
                    {unavailableHint && !compact ? (
                      <span className="ml-auto rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-muted)] px-1.5 py-0.5 font-[var(--ff-font-mono)] text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ff-text-muted)]" data-sidebar-unavailable-hint="true">
                        {unavailableHint}
                      </span>
                    ) : null}
                    {iconOnlyTooltip(navigationLabel)}
                  </>
                )

                return item.href ? (
                  <Link aria-label={navigationLabel} className={itemClassName} key={item.labelKey} title={navigationLabel} to={productPath(item.href)}>
                    {itemContent}
                  </Link>
                ) : (
                  <button
                    aria-disabled="true"
                    aria-label={navigationLabel}
                    className={itemClassName}
                    data-nav-unavailable="true"
                    disabled
                    key={item.labelKey}
                    title={navigationLabel}
                    type="button"
                  >
                    {itemContent}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className={cn('flex w-full shrink-0 flex-col pt-3', compact ? 'items-center gap-1.5' : 'items-stretch gap-1.5')}>
            <div
              aria-label={resolvedUserLabel}
              className={cn(
                'group relative flex h-[44px] min-w-0 items-center rounded-[var(--ff-radius-sm)] text-[var(--ff-text-secondary)]',
                compact ? 'w-11 justify-center' : 'w-full gap-3 px-4',
              )}
              title={resolvedUserLabel}
            >
              <span className="material-symbols-outlined shrink-0 text-[23px]">{userIcon}</span>
              {renderLabel(resolvedUserLabel, 'text-[15px] font-medium')}
              {iconOnlyTooltip(resolvedUserLabel)}
            </div>

            {onSignOut ? (
              <button
                aria-label={isSigningOut ? getCopy(copy.shell.nav.signingOut, locale) : getCopy(copy.shell.nav.signOut, locale)}
                className={cn(
                  'group relative flex h-[44px] min-w-0 items-center rounded-[var(--ff-radius-sm)] text-[var(--ff-text-secondary)] transition-colors hover:bg-[var(--ff-surface-panel)] hover:text-[var(--ff-accent-text)] disabled:cursor-not-allowed disabled:opacity-50',
                  compact ? 'w-11 justify-center' : 'w-full gap-3 px-4',
                )}
                disabled={isSigningOut}
                onClick={onSignOut}
                title={isSigningOut ? getCopy(copy.shell.nav.signingOut, locale) : getCopy(copy.shell.nav.signOut, locale)}
                type="button"
              >
                <span className="material-symbols-outlined shrink-0 text-[23px]">logout</span>
                {renderLabel(isSigningOut ? getCopy(copy.shell.nav.signingOut, locale) : getCopy(copy.shell.nav.signOut, locale), 'text-[15px] font-medium')}
                {iconOnlyTooltip(isSigningOut ? getCopy(copy.shell.nav.signingOut, locale) : getCopy(copy.shell.nav.signOut, locale))}
              </button>
            ) : null}
          </div>

          <div
            aria-label={
              locale === 'zh'
                ? compact
                  ? '点击隐藏侧边栏，拖拽调整宽度'
                  : '点击收起到图标侧边栏，拖拽调整宽度'
                : compact
                  ? 'Click to hide sidebar, drag to resize'
                  : 'Click to collapse to icon sidebar, drag to resize'
            }
            aria-orientation="vertical"
            aria-valuemax={sidebarMaxWidth}
            aria-valuemin={sidebarMinWidth}
            aria-valuenow={width}
            className="group absolute right-[-7px] top-0 z-[70] h-full w-[14px] cursor-col-resize touch-none outline-none"
            onKeyDown={resizeWithKeyboard}
            onPointerDown={startResize}
            role="separator"
            tabIndex={0}
            title={
              locale === 'zh'
                ? compact
                  ? '点击隐藏，拖拽调整'
                  : '点击收起，拖拽调整'
                : compact
                  ? 'Click to hide, drag to resize'
                  : 'Click to collapse, drag to resize'
            }
          >
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--ff-border-default)] transition-colors group-hover:bg-[var(--ff-accent-primary)] group-focus-visible:bg-[var(--ff-accent-primary)]" />
            <span className="absolute left-1/2 top-1/2 flex h-14 w-[8px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[var(--ff-radius-full)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-shell)] shadow-[0_0_14px_rgba(0,0,0,0.28)] transition-[border-color,box-shadow] group-hover:border-[var(--ff-accent-primary)] group-hover:shadow-[0_0_20px_color-mix(in_srgb,var(--ff-accent-primary)_30%,transparent)] group-focus-visible:border-[var(--ff-accent-primary)]">
              <span className="h-7 w-[3px] rounded-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)] opacity-80" />
            </span>
          </div>
        </SidebarShell>
      )}
    </>
  )
}
