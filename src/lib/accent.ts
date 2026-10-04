/**
 * [INPUT]: 无运行时外部依赖。
 * [OUTPUT]: 对外提供强调色预设、校验、派生停档与 DOM 应用函数。
 * [POS]: lib 的单强调色真相源。换色只改 --ff-accent，strong/soft 由它派生；临床语义色不跟强调色走。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
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

// WCAG relative luminance; choose foregrounds against the surfaces they actually use.
function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function contrast(left: string, right: string) {
  const values = [luminance(left), luminance(right)]
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}

function readableText(accent: string, backgrounds: string[], target: string) {
  for (let step = 0; step <= 100; step += 1) {
    const candidate = mix(accent, target, step / 100)
    if (backgrounds.every((background) => contrast(candidate, background) >= 4.5)) return candidate
  }
  return target
}

export const clinicalColors = {
  light: { critical: '#B42318', low: '#175CD3', success: '#18743F', warning: '#805400' },
  dark: { critical: '#FF8A80', low: '#83B4FF', success: '#6FCF97', warning: '#E5B76A' },
} as const

export function deriveAccentStops(accent: string, theme: 'dark' | 'light') {
  const normalized = normalizeAccentHex(accent)
  const dark = theme === 'dark'
  const foreground = contrast(normalized, '#000000') >= contrast(normalized, '#FFFFFF') ? '#000000' : '#FFFFFF'
  const soft = mix(normalized, dark ? '#000000' : '#FFFFFF', dark ? 0.82 : 0.88)

  return {
    accent: normalized,
    primary: normalized,
    foreground,
    strong: mix(normalized, foreground === '#FFFFFF' ? '#000000' : '#FFFFFF', 0.12),
    soft,
    text: readableText(normalized, [soft, ...(dark ? ['#000000', '#111111', '#1A1A1A'] : ['#FFFFFF', '#F5F5F5', '#F5F5F5'])], dark ? '#FFFFFF' : '#000000'),
    ...clinicalColors[theme],
  }
}

export function applyAccent(accent: string, theme: 'dark' | 'light' = 'dark') {
  if (typeof document === 'undefined') return

  const stops = deriveAccentStops(accent, theme)
  const root = document.documentElement
  const properties = {
    '--ff-accent': stops.accent,
    '--ff-accent-primary': stops.primary,
    '--ff-accent-foreground': stops.foreground,
    '--ff-accent-text': stops.text,
    '--ff-accent-strong': stops.strong,
    '--ff-accent-soft': stops.soft,
    '--ff-surface-accent': stops.soft,
    '--ff-accent-warning': stops.warning,
    '--ff-accent-success': stops.success,
    '--ff-critical': stops.critical,
    '--ff-low': stops.low,
    '--ff-border-strong': stops.accent,
  }
  for (const [key, value] of Object.entries(properties)) root.style.setProperty(key, value)
  root.dataset.accent = stops.accent
}
