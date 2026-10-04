/**
 * [INPUT]: 依赖 ./accent 的预设、校验与派生停档。
 * [OUTPUT]: 对外提供单强调色切换合同测试。
 * [POS]: lib 的强调色测试，约束苹果彩虹预设、非法值回退默认橙、strong/soft 由同一色源派生。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import { accentPresets, defaultAccentHex, deriveAccentStops, normalizeAccentHex } from './accent'

describe('accent presets', () => {
  it('offers a muted rainbow of eight presets', () => {
    expect(accentPresets.map((entry) => entry.id)).toEqual(['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple'])
    expect(defaultAccentHex).toBe('#C48A4A')
  })

  it('falls back to muted orange for invalid values', () => {
    expect(normalizeAccentHex('nope')).toBe(defaultAccentHex)
    expect(normalizeAccentHex('#4A7C9B')).toBe('#4A7C9B')
    expect(normalizeAccentHex('blue')).toBe('#4A7C9B')
  })

  it('derives strong and soft from the same accent source', () => {
    const stops = deriveAccentStops('#4A7C9B', 'light')

    expect(stops.accent).toBe('#4A7C9B')
    expect(stops.primary).toBe('#4A7C9B')
    expect(stops.warning).not.toBe(stops.accent)
    expect(stops.strong).not.toBe(stops.accent)
    expect(stops.soft).not.toBe(stops.accent)
  })
})

// Independent contrast calculation checks the visible contract, not the mixing algorithm.
function ratio(left: string, right: string) {
  const luminance = (hex: string) => {
    const values = hex.match(/[a-f0-9]{2}/gi)!.map((value) => Number.parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
  }
  const a = luminance(left), b = luminance(right)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

it.each(['dark', 'light'] as const)('keeps all eight presets readable in %s, including hover and status labels', (theme) => {
  for (const preset of accentPresets) {
    const stops = deriveAccentStops(preset.hex, theme)
    expect(ratio(stops.primary, stops.foreground)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(stops.strong, stops.foreground)).toBeGreaterThanOrEqual(4.5)
    const surfaces = theme === 'dark' ? ['#000000', '#111111', '#1A1A1A', stops.soft] : ['#FFFFFF', '#F5F5F5', '#F5F5F5', stops.soft]
    for (const surface of surfaces) {
      for (const foreground of [stops.text, stops.critical, stops.low, stops.success, stops.warning]) {
        expect(ratio(surface, foreground), `${preset.id}: ${foreground} on ${surface}`).toBeGreaterThanOrEqual(4.5)
      }
    }
    expect(stops.warning).toBe(deriveAccentStops(defaultAccentHex, theme).warning)
  }
})
