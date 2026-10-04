/**
 * [INPUT]: 依赖 react 的 effect/ref/external-store hooks、登录页根节点与 hero 节点、当前 Locale/Theme，以及客户端动态加载的 gsap/ScrollTrigger。
 * [OUTPUT]: 对外提供 useScrollStoryMotion，管理 reduced-motion、章节 scrub、CSS sticky 进度、refresh、卸载清理与首屏 WebGL 活跃状态。
 * [POS]: components/login 的客户端动效边界；模块求值与静态渲染阶段不加载、不注册 GSAP 运行时。
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
    const rootNode = rootRef.current
    if (!rootNode) {
      return
    }

    const scope = rootNode
    scope.dataset.scrollStoryMode = prefersReducedMotion ? 'reduced' : 'animated'
    scope.dataset.scrollStoryTriggerCount = '0'
    if (prefersReducedMotion) {
      refreshRef.current = null
      return
    }

    let cancelled = false
    let context: { revert: () => void } | null = null
    let refreshFrame = 0

    async function setupMotion() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (cancelled || !scope.isConnected) {
        return
      }

      gsap.registerPlugin(ScrollTrigger)
      const select = gsap.utils.selector(scope)
      const one = (selector: string) => select(selector)[0] as HTMLElement | undefined
      const all = (selector: string) => select(selector) as HTMLElement[]

      context = gsap.context(() => {
        const problem = one('#story-problem')
        const intake = one('#story-intake')
        const timeline = one('#story-timeline')
        const views = one('#story-views')
        const viewsSticky = one('#story-views-sticky')
        const viewsExit = one('#story-views-exit')
        const viewsFrame = one('#story-views-frame')
        const labs = one('#story-labs')
        const layerTrigger = one('#story-layer-trigger')

        if (problem) {
          gsap.fromTo(
            all('[data-story-motion="problem-title"]'),
            { opacity: 0, y: 56 },
            {
              ease: 'none',
              opacity: 1,
              scrollTrigger: { end: 'top 60%', scrub: 0.3, start: 'top 80%', trigger: problem },
              y: 0,
            },
          )
          gsap.fromTo(
            all('[data-story-motion="problem-body"]'),
            { opacity: 0, y: 42 },
            {
              ease: 'none',
              opacity: 1,
              scrollTrigger: { end: 'top 55%', scrub: 0.3, start: 'top 75%', trigger: problem },
              stagger: 0.08,
              y: 0,
            },
          )
        }

        if (intake) {
          gsap.fromTo(
            all('[data-story-motion="intake-step"]'),
            { opacity: 0, y: 52 },
            {
              ease: 'none',
              opacity: 1,
              scrollTrigger: { end: 'top 50%', scrub: 0.3, start: 'top 70%', trigger: intake },
              stagger: 0.1,
              y: 0,
            },
          )
        }

        if (timeline) {
          gsap.fromTo(
            all('[data-story-motion="timeline-card"]'),
            { opacity: 0, y: 46 },
            {
              ease: 'none',
              opacity: 1,
              scrollTrigger: { end: 'top 55%', scrub: 0.3, start: 'top 75%', trigger: timeline },
              stagger: 0.08,
              y: 0,
            },
          )
        }

        if (views && viewsSticky && viewsExit && viewsFrame) {
          gsap.fromTo(
            viewsFrame,
            { opacity: 0, y: 48 },
            {
              ease: 'none',
              opacity: 1,
              scrollTrigger: { end: 'top 30%', scrub: 0.5, start: 'top 70%', trigger: viewsSticky },
              y: 0,
            },
          )

          gsap.to(viewsExit, {
            ease: 'none',
            opacity: 0.15,
            scrollTrigger: {
              end: 'bottom center',
              endTrigger: views,
              scrub: 0.5,
              start: '80% center',
              trigger: viewsSticky,
            },
          })

          const viewPanels = all('[data-story-view-panel]')
          gsap.set(viewPanels, { opacity: (index) => (index === 0 ? 1 : 0), y: (index) => (index === 0 ? 0 : 28) })
          const viewsTimeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { end: 'bottom bottom', scrub: 0.5, start: 'top top', trigger: views },
          })
          viewsTimeline
            .to(viewPanels[0], { opacity: 0, y: -24, duration: 1 }, 0.8)
            .to(viewPanels[1], { opacity: 1, y: 0, duration: 1 }, 1.1)
            .to(viewPanels[1], { opacity: 0, y: -24, duration: 1 }, 2.2)
            .to(viewPanels[2], { opacity: 1, y: 0, duration: 1 }, 2.5)
        }

        if (labs) {
          gsap.fromTo(
            all('[data-story-motion="labs-trend"]'),
            { opacity: 0, y: 44 },
            {
              ease: 'none',
              opacity: 1,
              scrollTrigger: { end: 'top 50%', scrub: 0.3, start: 'top 70%', trigger: labs },
              y: 0,
            },
          )
          gsap.fromTo(
            all('.story-lab-line'),
            { scaleX: 0 },
            {
              ease: 'none',
              scaleX: 1,
              scrollTrigger: { end: 'top 50%', scrub: 0.3, start: 'top 70%', trigger: labs },
            },
          )
        }

        if (layerTrigger) {
          gsap.to(all('[data-story-layer]'), {
            ease: 'none',
            scrollTrigger: { end: 'center top', scrub: 1, start: 'top 30%', trigger: layerTrigger },
            yPercent: -12,
          })
        }
      }, scope)

      refreshRef.current = () => ScrollTrigger.refresh()
      refreshFrame = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh()
        const ownedCount = ScrollTrigger.getAll().filter((instance) => {
          const trigger = instance.trigger
          return trigger instanceof Element && scope.contains(trigger)
        }).length
        scope.dataset.scrollStoryTriggerCount = String(ownedCount)
      })
    }

    void setupMotion()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(refreshFrame)
      refreshRef.current = null
      context?.revert()
      scope.dataset.scrollStoryTriggerCount = '0'
    }
  }, [prefersReducedMotion, rootRef])

  useEffect(() => {
    if (prefersReducedMotion || !refreshRef.current) {
      return
    }

    const frame = window.requestAnimationFrame(() => refreshRef.current?.())
    return () => window.cancelAnimationFrame(frame)
  }, [locale, prefersReducedMotion, theme])

  return { isHeroVisualActive, prefersReducedMotion }
}
