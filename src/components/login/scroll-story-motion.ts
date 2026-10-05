/**
 * [INPUT]: 依赖 react 的 effect/ref/external-store hooks、登录页根节点与 hero 节点、当前 Locale/Theme，以及浏览器滚动、rAF、ResizeObserver 与布局 API。
 * [OUTPUT]: 对外提供 createScrollStoryMotion 与 useScrollStoryMotion，管理可逆章节进度、布局重测、静态降级、清理与首屏可见状态。
 * [POS]: components/login 的客户端动效边界；不接管浏览器滚动或 CSS sticky 定位；模块求值与静态渲染不访问浏览器 API。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

import type { Locale } from '@/lib/locale'
import type { Theme } from '@/lib/theme'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function readReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function subscribeReducedMotion(listener: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => true)
}

function useHeroVisibility(heroRef: RefObject<HTMLElement | null>, disabled: boolean) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const hero = heroRef.current
    if (disabled || !hero) {
      return
    }

    if (!('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio > 0.04),
      { rootMargin: '18% 0px 18% 0px', threshold: [0, 0.04, 0.2] },
    )
    observer.observe(hero)

    return () => observer.disconnect()
  }, [disabled, heroRef])

  return !disabled && isVisible
}

type MotionElement = HTMLElement | SVGElement
type MotionGroup = {
  measure: () => [number, number]
  render: (progress: number) => void
  seconds: number
  start: number
  end: number
  progress: number
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const intervalProgress = (value: number, start: number, end: number) => clamp((value - start) / Math.max(1, end - start))
const tweenProgress = (time: number, start: number, duration = 1) => clamp((time - start) / duration)

/** Browser-only controller. CSS owns layout; this controller owns just opacity/transform. */
export function createScrollStoryMotion(scope: HTMLElement) {
  const groups: MotionGroup[] = []
  const observed = new Set<Element>([scope])
  const originals = new Map<MotionElement, Map<string, [string, string]>>()
  const one = (selector: string) => scope.querySelector<HTMLElement>(selector)
  const all = (selector: string) => Array.from(scope.querySelectorAll<MotionElement>(selector))
  const top = (element: Element) => element.getBoundingClientRect().top + window.scrollY
  const height = (element: Element) => element.getBoundingClientRect().height
  let disposed = false
  let geometryDirty = true
  let frame: number | null = null
  let lastTime: number | null = null

  function write(element: MotionElement, property: 'opacity' | 'transform', value: string) {
    let saved = originals.get(element)
    if (!saved) {
      saved = new Map()
      originals.set(element, saved)
    }
    if (!saved.has(property)) saved.set(property, [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)])
    element.style.setProperty(property, value)
  }

  function add(measure: MotionGroup['measure'], render: MotionGroup['render'], seconds: number) {
    groups.push({ measure, render, seconds, start: 0, end: 1, progress: 0 })
  }

  function reveal(trigger: HTMLElement | null, targets: MotionElement[], y: number, start: number, end: number, seconds = 0.3, stagger = 0) {
    if (!trigger || !targets.length) return
    observed.add(trigger)
    add(
      () => [top(trigger) - window.innerHeight * start, top(trigger) - window.innerHeight * end],
      (progress) => targets.forEach((target, index) => {
        // Preserve the old half-second tween and stagger proportions within the scroll span.
        const local = tweenProgress(progress * (0.5 + stagger * (targets.length - 1)), stagger * index, 0.5)
        write(target, 'opacity', String(local))
        write(target, 'transform', `translateY(${y * (1 - local)}px)`)
      }),
      seconds,
    )
  }

  reveal(one('#story-problem'), all('[data-story-motion="problem-title"]'), 56, 0.8, 0.6)
  reveal(one('#story-problem'), all('[data-story-motion="problem-body"]'), 42, 0.75, 0.55, 0.3, 0.08)
  reveal(one('#story-intake'), all('[data-story-motion="intake-step"]'), 52, 0.7, 0.5, 0.3, 0.1)
  reveal(one('#story-timeline'), all('[data-story-motion="timeline-card"]'), 46, 0.75, 0.55, 0.3, 0.08)

  const views = one('#story-views')
  const sticky = one('#story-views-sticky')
  const exit = one('#story-views-exit')
  const viewsFrame = one('#story-views-frame')
  if (views && sticky && exit && viewsFrame) {
    observed.add(views)
    observed.add(sticky)
    // Sticky's viewport rect stops moving while pinned by CSS; measure its layout anchor instead.
    const stickyTop = () => top(views) + sticky.offsetTop
    add(
      () => [stickyTop() - window.innerHeight * 0.7, stickyTop() - window.innerHeight * 0.3],
      (progress) => {
        write(viewsFrame, 'opacity', String(progress))
        write(viewsFrame, 'transform', `translateY(${48 * (1 - progress)}px)`)
      },
      0.5,
    )
    add(
      () => [stickyTop() + height(sticky) * 0.8 - window.innerHeight * 0.5, top(views) + height(views) - window.innerHeight * 0.5],
      (progress) => write(exit, 'opacity', String(1 - progress * 0.85)),
      0.5,
    )
    const panels = all('[data-story-view-panel]')
    if (panels.length === 3) add(
      () => [top(views), top(views) + height(views) - window.innerHeight],
      (progress) => {
        const time = progress * 3.5
        const firstOut = tweenProgress(time, 0.8)
        const secondIn = tweenProgress(time, 1.1)
        const secondOut = tweenProgress(time, 2.2)
        const thirdIn = tweenProgress(time, 2.5)
        const states = [
          [1 - firstOut, -24 * firstOut],
          [secondIn * (1 - secondOut), 28 * (1 - secondIn) - 24 * secondOut],
          [thirdIn, 28 * (1 - thirdIn)],
        ]
        panels.forEach((panel, index) => {
          write(panel, 'opacity', String(states[index][0]))
          write(panel, 'transform', `translateY(${states[index][1]}px)`)
        })
      },
      0.5,
    )
  }

  const labs = one('#story-labs')
  reveal(labs, all('[data-story-motion="labs-trend"]'), 44, 0.7, 0.5)
  if (labs) {
    const lines = all('.story-lab-line')
    if (lines.length) add(
      () => [top(labs) - window.innerHeight * 0.7, top(labs) - window.innerHeight * 0.5],
      (progress) => lines.forEach((line) => write(line, 'transform', `scaleX(${progress})`)),
      0.3,
    )
  }
  const layerTrigger = one('#story-layer-trigger')
  const layers = all('[data-story-layer]')
  if (layerTrigger && layers.length) {
    observed.add(layerTrigger)
    let layerHeights: number[] = []
    add(
      () => {
        layerHeights = layers.map(height)
        return [top(layerTrigger) - window.innerHeight * 0.3, top(layerTrigger) + height(layerTrigger) * 0.5]
      },
      (progress) => layers.forEach((layer, index) => write(layer, 'transform', `translateY(${-0.12 * layerHeights[index] * progress}px)`)),
      1,
    )
  }

  function measure() {
    groups.forEach((group) => { [group.start, group.end] = group.measure() })
    geometryDirty = false
  }

  function tick(time: number) {
    frame = null
    if (disposed) return
    if (geometryDirty) measure()
    const elapsed = lastTime === null ? 16 : Math.max(0, time - lastTime)
    lastTime = time
    let moving = false
    const scroll = window.scrollY
    groups.forEach((group) => {
      const target = intervalProgress(scroll, group.start, group.end)
      // Time-based convergence retains the short/medium/long following rhythm at any refresh rate.
      const next = group.progress + (target - group.progress) * (1 - Math.exp(-elapsed * 5 / (group.seconds * 1000)))
      group.progress = Math.abs(target - next) < 0.0001 ? target : next
      group.render(group.progress)
      moving ||= group.progress !== target
    })
    if (moving) frame = window.requestAnimationFrame(tick)
    else lastTime = null
  }

  function schedule() {
    if (!disposed && frame === null) frame = window.requestAnimationFrame(tick)
  }

  function refresh() {
    geometryDirty = true
    schedule()
  }

  // A restored scroll position starts at its matching state instead of replaying from the top.
  measure()
  groups.forEach((group) => {
    group.progress = intervalProgress(window.scrollY, group.start, group.end)
    group.render(group.progress)
  })
  scope.dataset.scrollStoryMotionCount = String(groups.length)
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', refresh, { passive: true })
  scope.addEventListener('load', refresh, true)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh)
  observed.forEach((element) => observer?.observe(element))
  void document.fonts?.ready.then(() => { if (!disposed) refresh() })

  return {
    refresh,
    dispose() {
      disposed = true
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', refresh)
      scope.removeEventListener('load', refresh, true)
      observer?.disconnect()
      originals.forEach((saved, element) => saved.forEach(([value, priority], property) => {
        if (value) element.style.setProperty(property, value, priority)
        else element.style.removeProperty(property)
      }))
      scope.dataset.scrollStoryMotionCount = '0'
    },
  }
}

type ScrollStoryMotionOptions = {
  heroRef: RefObject<HTMLElement | null>
  locale: Locale
  rootRef: RefObject<HTMLDivElement | null>
  theme: Theme
}

export function useScrollStoryMotion({ heroRef, locale, rootRef, theme }: ScrollStoryMotionOptions) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const isHeroVisualActive = useHeroVisibility(heroRef, prefersReducedMotion)
  const refreshRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const scope = rootRef.current
    if (!scope) return
    scope.dataset.scrollStoryMode = prefersReducedMotion ? 'reduced' : 'animated'
    scope.dataset.scrollStoryMotionCount = '0'
    if (prefersReducedMotion) return
    const motion = createScrollStoryMotion(scope)
    refreshRef.current = motion.refresh
    return () => {
      refreshRef.current = null
      motion.dispose()
    }
  }, [prefersReducedMotion, rootRef])

  useEffect(() => { refreshRef.current?.() }, [locale, prefersReducedMotion, theme])
  return { isHeroVisualActive, prefersReducedMotion }
}
