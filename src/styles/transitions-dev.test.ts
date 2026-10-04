/**
 * [INPUT]: 依赖共享 transitions.dev CSS 与正式路由源码。
 * [OUTPUT]: 对外提供共享产品动效合同的静态回归测试，约束 V3 保持、进入/按压/tab/icon 动效预算、reduced-motion 与路由组合边界。
 * [POS]: styles 的共享动效测试文件，避免把跨模块 motion contract 挤进单个页面测试文件。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('shared product motion contract', () => {
  it('keeps the V3 motion budget quiet, composable, and reduced-motion safe', () => {
    const source = readSource('./transitions-dev.css')

    for (const motionClass of [
      '.t-route-reveal',
      '.t-stagger',
      '.t-control-press',
      '.t-accordion',
      '.t-tab-switch',
      '.t-gantt-grow',
      '.t-popover',
    ]) {
      expect(source).toContain(motionClass)
    }

    expect(source).toContain('--route-reveal-dur: 340ms')
    expect(source).toContain('--route-reveal-y: 10px')
    expect(source).toContain('--stagger-dur: 320ms')
    expect(source).toContain('--stagger-y: 8px')
    expect(source).toContain('--stagger-step: 50ms')
    expect(source).toContain('--control-press-dur: 140ms')
    expect(source).toContain('--tab-switch-dur: 160ms')
    expect(source).toContain('--icon-swap-dur: 170ms')
    expect(source).toContain('--icon-swap-start-scale: 0.94')
    expect(source).not.toContain('@keyframes t-tab-switch-pop')
    expect(source).not.toContain('animation: t-tab-switch-pop')
    expect(source).toContain('transform: scale(0.97)')
    expect(source).toContain('border-color var(--tab-switch-dur) var(--tab-switch-ease)')
    expect(source).not.toContain('.t-tab-switch-thumb')
    expect(source).not.toContain('--tab-switch-slide-dur')
    expect(source).toContain('transform: scale(var(--icon-swap-start-scale))')
    expect(source).toContain('@media (hover: hover) and (pointer: fine)')

    const routeKeyframeStart = source.indexOf('@keyframes t-route-reveal-in')
    const routeClassStart = source.indexOf('.t-route-reveal', routeKeyframeStart)
    const staggerKeyframeStart = source.indexOf('@keyframes t-stagger-in')
    const staggerClassStart = source.indexOf('.t-stagger', staggerKeyframeStart)

    expect(source.slice(routeKeyframeStart, routeClassStart)).not.toContain('filter:')
    expect(source.slice(staggerKeyframeStart, staggerClassStart)).not.toContain('filter:')
    expect(source).not.toMatch(/\.t-route-reveal \{[^}]*will-change:/)
    expect(source).not.toMatch(/\.t-stagger \{[^}]*will-change:/)
    expect(source).not.toContain('transition-all')
    expect(source).toMatch(/\.t-route-reveal,[\s\S]*\.t-popover,[\s\S]*animation: none !important/)
  })

  it('keeps route reveal and child stagger on separate production nodes', () => {
    for (const routeSource of [
      '../routes/workspace-page.tsx',
      '../routes/lab-analytics-page.tsx',
      '../routes/shared-record-page.tsx',
      '../routes/record-page.tsx',
    ]) {
      const source = readSource(routeSource)
      expect(source).not.toContain('t-route-reveal t-stagger')
      expect(source).not.toContain('t-stagger t-route-reveal')
    }
  })
})
