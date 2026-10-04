/**
 * [INPUT]: 无运行时外部依赖，承载 Firefly-Isle 主题 token 真相源。
 * [OUTPUT]: 对外提供 themeNames、ThemeName、themeTokens、紧凑默认侧栏几何常量、边缘钉住顶栏、shell 内容宽度合同与过渡类常量。
 * [POS]: src/lib/theme 的 token 定义文件，统一 dark/light 的颜色、surface、文字、边框、状态、紧凑响应式侧栏、边缘钉住顶栏与宽幅内容几何合同。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { clinicalColors, defaultAccentHex, deriveAccentStops } from '@/lib/accent'

export const themeNames = ['dark', 'light'] as const

export type ThemeName = (typeof themeNames)[number]

export const sidebarDefaultWidth = 220
export const sidebarMinWidth = 72
export const sidebarMaxWidth = 296
export const sidebarLabelHideWidth = 204
export const sidebarWidthClass = 'w-[var(--ff-sidebar-width)]'
export const sidebarOffsetClass = 'md:ml-[var(--ff-sidebar-offset)]'
export const shellViewportOffsetClass = 'left-0 right-0 md:left-[var(--ff-sidebar-offset)]'
export const shellContentWidthClass = 'w-full'
export const shellWideContentClass = 'mx-auto w-full max-w-[1760px]'
export const topBarHeightClass = 'min-h-[var(--ff-topbar-height)] pt-[var(--ff-safe-top)]'
export const topBarOffsetClass = 'pt-[var(--ff-topbar-height)]'
export const themeTransitionClass = 'transition-[background-color,color,border-color,box-shadow] duration-200 ease-out'

// 强调色与临床语义色由 accent.ts 统一派生；预设不改变状态含义。
export const accentBase = defaultAccentHex
export const accentCritical = clinicalColors.light.critical
export const accentLow = clinicalColors.light.low

export const themeTokens = {
  dark: {
    accent: deriveAccentStops(accentBase, 'dark'),
    border: {
      default: '#30363A',
      muted: 'rgba(244,240,232,0.14)',
      strong: '#C48A4A',
    },
    surface: {
      accent: deriveAccentStops(accentBase, 'dark').soft,
      base: '#000000',
      inset: '#0D0D0D',
      panel: '#111111',
      paper: '#FFFFFF',
      paperMuted: '#F1F0EC',
      shell: '#000000',
      sidebar: '#000000',
      soft: '#181D20',
      subtle: '#181D20',
      warning: '#2B2111',
    },
    text: {
      ink: '#0A0A0A',
      muted: '#A9A39A',
      primary: '#F4F0E8',
      secondary: 'rgba(244,240,232,0.72)',
      subtle: 'rgba(244,240,232,0.88)',
    },
  },
  light: {
    accent: deriveAccentStops(accentBase, 'light'),
    border: {
      default: '#D8D5CE',
      muted: 'rgba(22,22,22,0.12)',
      strong: '#C48A4A',
    },
    surface: {
      accent: deriveAccentStops(accentBase, 'light').soft,
      base: '#FFFFFF',
      inset: '#F4F4F2',
      panel: '#FFFFFF',
      paper: '#FFFFFF',
      paperMuted: '#F1F0EC',
      shell: '#FFFFFF',
      sidebar: '#FFFFFF',
      soft: '#F1F0EC',
      subtle: '#F4F4F2',
      warning: '#FFF1D6',
    },
    text: {
      ink: '#0A0A0A',
      muted: '#6F6B65',
      primary: '#161616',
      secondary: 'rgba(22,22,22,0.7)',
      subtle: 'rgba(22,22,22,0.82)',
    },
  },
} as const
