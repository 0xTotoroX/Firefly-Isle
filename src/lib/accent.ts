/**
 * [INPUT]: 无运行时外部依赖。
 * [OUTPUT]: 对外提供强调色预设、校验、派生停档与 DOM 应用函数。
 * [POS]: lib 的单强调色真相源。换色只改 --ff-accent，strong/soft 由它派生；临床语义色不跟强调色走。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const ACCENT_STORAGE_KEY = 'firefly-accent'

export const accentPresets = [
  { id: 'ember', hex: '#E85D2A', label: { zh: '萤火', en: 'Ember' } },
  { id: 'ink', hex: '#1E40D8', label: { zh: '墨蓝', en: 'Ink' } },
  { id: 'moss', hex: '#0F7B4A', label: { zh: '苔绿', en: 'Moss' } },
  { id: 'plum', hex: '#7C3AED', label: { zh: '紫藤', en: 'Plum' } },
  { id: 'dusk', hex: '#C2410C', label: { zh: '暮橙', en: 'Dusk' } },
] as const

export type AccentPresetId = (typeof accentPresets)[number]['id']

export const defaultAccentHex = accentPresets[0].hex

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/

export function isAccentHex(value: string): value is `#${string}` {
  return HEX_PATTERN.test(value)
}

export function normalizeAccentHex(value: string | null | undefined, fallback = defaultAccentHex) {
  const trimmed = value?.trim() ?? ''

  if (isAccentHex(trimmed)) {
    return trimmed.toUpperCase()
  }

  const preset = accentPresets.find((entry) => entry.id === trimmed || entry.hex.toUpperCase() === trimmed.toUpperCase())

  return preset ? preset.hex : fallback
}

function hexToRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

function toHex(channel: number) {
  return Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')
}

function mix(hex: string, target: string, amount: number) {
  const left = hexToRgb(hex)
  const right = hexToRgb(target)

  return `#${toHex(left.r + (right.r - left.r) * amount)}${toHex(left.g + (right.g - left.g) * amount)}${toHex(left.b + (right.b - left.b) * amount)}`.toUpperCase()
}

export function deriveAccentStops(accent: string, theme: 'dark' | 'light') {
  const normalized = normalizeAccentHex(accent)

  return {
    accent: normalized,
    primary: normalized,
    strong: mix(normalized, '#FFFFFF', 0.18),
    soft: theme === 'dark' ? mix(normalized, '#080A0B', 0.82) : mix(normalized, '#FFFFFF', 0.88),
    warning: normalized,
  }
}

export function applyAccent(accent: string, theme: 'dark' | 'light' = 'dark') {
  if (typeof document === 'undefined') {
    return
  }

  const stops = deriveAccentStops(accent, theme)
  const root = document.documentElement

  root.style.setProperty('--ff-accent', stops.accent)
  root.style.setProperty('--ff-accent-primary', stops.primary)
  root.style.setProperty('--ff-accent-strong', stops.strong)
  root.style.setProperty('--ff-accent-soft', stops.soft)
  root.style.setProperty('--ff-accent-warning', stops.warning)
  root.style.setProperty('--ff-border-strong', stops.accent)
  root.dataset.accent = stops.accent
}
