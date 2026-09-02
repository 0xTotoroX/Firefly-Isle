/**
 * [INPUT]: 无运行时外部依赖。
 * [OUTPUT]: 对外提供强调色预设、校验、派生停档与 DOM 应用函数。
 * [POS]: lib 的单强调色真相源。换色只改 --ff-accent，strong/soft 由它派生；临床语义色不跟强调色走。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const ACCENT_STORAGE_KEY = 'firefly-accent'

export const accentPresets = [
  { id: 'red', hex: '#B85C54', label: { zh: '红', en: 'Red' } },
  { id: 'orange', hex: '#C48A4A', label: { zh: '橙', en: 'Orange' } },
  { id: 'yellow', hex: '#B9A85A', label: { zh: '黄', en: 'Yellow' } },
  { id: 'green', hex: '#5E8C6A', label: { zh: '绿', en: 'Green' } },
  { id: 'teal', hex: '#4F8A86', label: { zh: '青', en: 'Teal' } },
  { id: 'blue', hex: '#4A7C9B', label: { zh: '蓝', en: 'Blue' } },
  { id: 'indigo', hex: '#6A6AA8', label: { zh: '靛', en: 'Indigo' } },
  { id: 'purple', hex: '#8A6A96', label: { zh: '紫', en: 'Purple' } },
] as const

export type AccentPresetId = (typeof accentPresets)[number]['id']

export const defaultAccentHex = accentPresets[1].hex

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
    strong: mix(normalized, '#FFFFFF', 0.12),
    soft: theme === 'dark' ? mix(normalized, '#000000', 0.82) : mix(normalized, '#FFFFFF', 0.88),
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
