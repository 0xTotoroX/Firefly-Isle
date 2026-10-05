// @vitest-environment happy-dom
/**
 * [INPUT]: happy-dom、真实原生控制器/React hook、可控 rAF 与合成章节布局。
 * [OUTPUT]: 原生滚动的可逆进度、三视图、恢复位置、布局重测、静态降级和清理行为测试。
 * [POS]: login 动效回归，不调用认证、患者服务或 WebGL。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useRef } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createScrollStoryMotion, useScrollStoryMotion } from './scroll-story-motion'

let scroll: number
let viewport: number
let time: number
let nextFrame: number
let frames: Map<number, FrameRequestCallback>
let observers: Array<{ callback: ResizeObserverCallback; disconnect: ReturnType<typeof vi.fn> }>
let disposers: Array<() => void>
let reduced: boolean
let preferenceListeners: Set<() => void>

beforeEach(() => {
  scroll = 0
  viewport = 1000
  time = 0
  nextFrame = 1
  frames = new Map()
  observers = []
  disposers = []
  reduced = false
  preferenceListeners = new Set()
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scroll)
  vi.spyOn(window, 'innerHeight', 'get').mockImplementation(() => viewport)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id) })
  vi.stubGlobal('ResizeObserver', class {
    callback: ResizeObserverCallback
    disconnect = vi.fn()
    observe = vi.fn()
    constructor(callback: ResizeObserverCallback) { this.callback = callback; observers.push(this) }
  })
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
    get matches() { return reduced },
    addEventListener: (_event: string, listener: () => void) => preferenceListeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => preferenceListeners.delete(listener),
  }) as unknown as MediaQueryList)
})

afterEach(() => {
  cleanup()
  disposers.forEach((dispose) => dispose())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function settle() {
  for (let index = 0; frames.size && index < 200; index++) {
    const callbacks = [...frames.values()]
    frames.clear()
    time += 50
    callbacks.forEach((callback) => callback(time))
  }
  expect(frames.size).toBe(0)
}

function fixture() {
  const scope = document.createElement('div')
  scope.innerHTML = `
    <section id="story-problem"><h2 data-story-motion="problem-title">Title</h2><p data-story-motion="problem-body">A</p><p data-story-motion="problem-body">B</p></section>
    <section id="story-intake"><p data-story-motion="intake-step">A</p><p data-story-motion="intake-step">B</p></section>
    <section id="story-timeline"><p data-story-motion="timeline-card">A</p><p data-story-motion="timeline-card">B</p></section>
    <section id="story-views"><div id="story-views-sticky"><div id="story-views-exit"><div id="story-views-frame"><article data-story-view-panel="dossier"></article><article data-story-view-panel="table"></article><article data-story-view-panel="gantt"></article></div></div></div></section>
    <section id="story-labs"><div data-story-motion="labs-trend"></div><svg><polyline class="story-lab-line" /></svg></section>
    <section id="story-layer-trigger"><div data-story-layer></div></section>`
  document.body.append(scope)
  const geometry: Record<string, [number, number]> = {
    'story-problem': [1000, 1000], 'story-intake': [2000, 1000], 'story-timeline': [2500, 1000],
    'story-views': [3000, 3200], 'story-views-sticky': [3000, 1000], 'story-labs': [7000, 1000], 'story-layer-trigger': [8000, 1000],
  }
  Object.keys(geometry).forEach((id) => {
    const element = scope.querySelector<HTMLElement>(`#${id}`)!
    element.getBoundingClientRect = () => ({ top: geometry[id][0] - scroll, height: geometry[id][1] }) as DOMRect
  })
  scope.querySelector<HTMLElement>('[data-story-layer]')!.getBoundingClientRect = () => ({ height: 500 }) as DOMRect
  return { scope, geometry, title: scope.querySelector<HTMLElement>('h2')!, panels: [...scope.querySelectorAll<HTMLElement>('[data-story-view-panel]')] }
}

function start(scope: HTMLElement) {
  const controller = createScrollStoryMotion(scope)
  disposers.push(controller.dispose)
  return controller
}

function move(y: number) {
  scroll = y
  window.dispatchEvent(new Event('scroll'))
  settle()
}

describe('native scroll story controller', () => {
  it('tracks forward and reverse scroll continuously and becomes idle', () => {
    const { scope, title } = fixture()
    start(scope)
    expect(title.style.opacity).toBe('0')
    move(300)
    expect(Number(title.style.opacity)).toBeCloseTo(0.5, 3)
    expect(title.style.transform).toBe('translateY(28px)')
    move(400)
    expect(title.style.opacity).toBe('1')
    move(200)
    expect(title.style.opacity).toBe('0')
    expect(title.style.transform).toBe('translateY(56px)')
  })

  it('initializes at a restored scroll position and reverses all three panels', () => {
    const { scope, panels } = fixture()
    scroll = 5200
    start(scope)
    expect(panels.map((panel) => panel.style.opacity)).toEqual(['0', '0', '1'])
    move(3000 + 2200 * 2.1 / 3.5)
    expect(Number(panels[1].style.opacity)).toBeCloseTo(1, 3)
    expect(panels[0].style.opacity).toBe('0')
    move(3000)
    expect(panels.map((panel) => panel.style.opacity)).toEqual(['1', '0', '0'])
    expect(scope.querySelector('#story-views-sticky')?.getAttribute('style')).toBeNull()
  })

  it('recomputes viewport and section geometry without resetting scroll', () => {
    const { scope, title, geometry } = fixture()
    scroll = 400
    start(scope)
    expect(title.style.opacity).toBe('1')
    viewport = 800
    window.dispatchEvent(new Event('resize'))
    settle()
    expect(scroll).toBe(400)
    expect(Number(title.style.opacity)).toBeCloseTo(0.25, 3)
    geometry['story-problem'][0] = 1300
    observers[0].callback([], {} as ResizeObserver)
    settle()
    expect(title.style.opacity).toBe('0')
    geometry['story-problem'][0] = 1000
    scope.dispatchEvent(new Event('load'))
    settle()
    expect(Number(title.style.opacity)).toBeCloseTo(0.25, 3)
  })

  it('keeps stagger, chart expansion and background parallax tied to their sections', () => {
    const { scope } = fixture()
    start(scope)
    move(1350)
    const steps = [...scope.querySelectorAll<HTMLElement>('[data-story-motion="intake-step"]')]
    expect(Number(steps[0].style.opacity)).toBeGreaterThan(Number(steps[1].style.opacity))
    move(6400)
    expect(scope.querySelector<SVGElement>('.story-lab-line')!.style.transform).toBe('scaleX(0.5)')
    move(8100)
    expect(scope.querySelector<HTMLElement>('[data-story-layer]')!.style.transform).toBe('translateY(-30px)')
  })

  it('refreshes geometry after late fonts and ignores font completion after disposal', async () => {
    const original = Object.getOwnPropertyDescriptor(document, 'fonts')
    let finish!: () => void
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise<void>((resolve) => { finish = resolve }) } })
    try {
      const { scope, title, geometry } = fixture()
      scroll = 400
      const controller = start(scope)
      expect(title.style.opacity).toBe('1')
      geometry['story-problem'][0] = 1300
      finish()
      await Promise.resolve()
      settle()
      expect(title.style.opacity).toBe('0')
      controller.dispose()
      Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise<void>((resolve) => { finish = resolve }) } })
      const next = start(scope)
      next.dispose()
      finish()
      await Promise.resolve()
      expect(frames.size).toBe(0)
    } finally {
      if (original) Object.defineProperty(document, 'fonts', original)
      else Reflect.deleteProperty(document, 'fonts')
    }
  })

  it('removes callbacks and observers and restores only its owned styles on dispose', () => {
    const { scope, title } = fixture()
    title.style.setProperty('opacity', '0.8', 'important')
    title.style.transform = 'translateX(3px)'
    const controller = start(scope)
    title.style.color = 'red'
    window.dispatchEvent(new Event('scroll'))
    expect(frames.size).toBe(1)
    controller.dispose()
    expect(frames.size).toBe(0)
    expect(observers[0].disconnect).toHaveBeenCalledOnce()
    expect(title.style.opacity).toBe('0.8')
    expect(title.style.getPropertyPriority('opacity')).toBe('important')
    expect(title.style.transform).toBe('translateX(3px)')
    expect(title.style.color).toBe('red')
    expect(scope.dataset.scrollStoryMotionCount).toBe('0')
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('resize'))
    observers[0].callback([], {} as ResizeObserver)
    scope.dispatchEvent(new Event('load'))
    controller.refresh()
    expect(frames.size).toBe(0)
    expect(title.style.opacity).toBe('0.8')
    disposers = []
  })
})

function HookFixture({ theme = 'dark', locale = 'zh' }: { theme?: 'dark' | 'light'; locale?: 'zh' | 'en' }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  useScrollStoryMotion({ rootRef, heroRef, theme, locale })
  return <div ref={rootRef}><section ref={heroRef} /><section id="story-problem"><h2 data-story-motion="problem-title">Title</h2></section></div>
}

describe('native motion React lifecycle', () => {
  it('starts no controller in reduced motion, cleans up when the preference changes, and unsubscribes', () => {
    reduced = true
    const view = render(<HookFixture />)
    const scope = view.container.firstElementChild as HTMLElement
    expect(scope.dataset.scrollStoryMode).toBe('reduced')
    expect(scope.dataset.scrollStoryMotionCount).toBe('0')
    expect(observers).toHaveLength(0)
    act(() => { reduced = false; preferenceListeners.forEach((listener) => listener()) })
    expect(scope.dataset.scrollStoryMode).toBe('animated')
    expect(observers).toHaveLength(1)
    act(() => { reduced = true; preferenceListeners.forEach((listener) => listener()) })
    expect(scope.dataset.scrollStoryMode).toBe('reduced')
    expect(scope.querySelector('h2')!.style.opacity).toBe('')
    expect(observers[0].disconnect).toHaveBeenCalledOnce()
    view.unmount()
    expect(preferenceListeners.size).toBe(0)
    expect(frames.size).toBe(0)
  })

  it('requests layout refresh on theme/locale changes and cancels it on unmount', () => {
    const view = render(<HookFixture />)
    settle()
    expect(frames.size).toBe(0)
    view.rerender(<HookFixture theme="light" locale="en" />)
    expect(frames.size).toBe(1)
    view.unmount()
    expect(frames.size).toBe(0)
    expect(observers[0].disconnect).toHaveBeenCalledOnce()
  })
})
