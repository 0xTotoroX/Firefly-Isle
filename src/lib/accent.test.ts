/**
 * [INPUT]: 依赖 ./accent 的预设、校验与派生停档。
 * [OUTPUT]: 对外提供单强调色切换合同测试。
 * [POS]: lib 的强调色测试，约束苹果彩虹预设、非法值回退默认橙、strong/soft 由同一色源派生。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
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
    expect(stops.warning).toBe('#4A7C9B')
    expect(stops.strong).not.toBe(stops.accent)
    expect(stops.soft).not.toBe(stops.accent)
  })
})
