/**
 * [INPUT]: 依赖 ./accent 的预设、校验与派生停档。
 * [OUTPUT]: 对外提供单强调色切换合同测试。
 * [POS]: lib 的强调色测试，约束预设合法、非法值回退默认萤火橙、strong/soft 由同一色源派生。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { describe, expect, it } from 'vitest'

import { defaultAccentHex, deriveAccentStops, normalizeAccentHex } from './accent'

describe('accent presets', () => {
  it('falls back to ember orange for invalid values', () => {
    expect(normalizeAccentHex('nope')).toBe(defaultAccentHex)
    expect(normalizeAccentHex('#E85D2A')).toBe('#E85D2A')
    expect(normalizeAccentHex('ink')).toBe('#1E40D8')
  })

  it('derives strong and soft from the same accent source', () => {
    const stops = deriveAccentStops('#1E40D8', 'light')

    expect(stops.accent).toBe('#1E40D8')
    expect(stops.primary).toBe('#1E40D8')
    expect(stops.warning).toBe('#1E40D8')
    expect(stops.strong).not.toBe(stops.accent)
    expect(stops.soft).not.toBe(stops.accent)
  })
})
