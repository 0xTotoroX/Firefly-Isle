/**
 * [INPUT]: 无运行时外部依赖，承载 Firefly-Isle 主题 token 真相源。
 * [OUTPUT]: 对外提供 themeNames、ThemeName、themeTokens、紧凑默认侧栏几何常量、边缘钉住顶栏、shell 内容宽度合同与过渡类常量。
 * [POS]: src/lib/theme 的 token 定义文件，统一 dark/light 的颜色、surface、文字、边框、状态、紧凑响应式侧栏、边缘钉住顶栏与宽幅内容几何合同。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
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

// 单强调色体系唯一色源：primary / warning / border.strong 均由此派生，换色只改这一个常量。
export const accentBase = '#E85D2A'
export const accentCritical = '#F04438'
export const accentLow = '#2F80ED'

export const themeTokens = {
  dark: {
    accent: {
      critical: accentCritical,
      low: accentLow,
      primary: accentBase,
      soft: '#2A1712',
      strong: '#FF4A1C',
      success: '#43A56B',
      warning: accentBase,
    },
    border: {
      default: '#30363A',
      muted: 'rgba(244,240,232,0.14)',
      strong: '#E85D2A',
    },
    surface: {
      accent: '#1F1512',
      base: '#080A0B',
      inset: '#0D1011',
      panel: '#111517',
      paper: '#FFFFFF',
      paperMuted: '#F1F0EC',
      shell: '#080A0B',
      sidebar: '#0B0E0F',
      soft: '#181D20',
      subtle: '#181D20',
      warning: '#2A1712',
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
    accent: {
      critical: accentCritical,
      low: accentLow,
      primary: accentBase,
      soft: '#FCE9E1',
      strong: '#FF4A1C',
      success: '#43A56B',
      warning: accentBase,
    },
    border: {
      default: '#D8D5CE',
      muted: 'rgba(22,22,22,0.12)',
      strong: '#E85D2A',
    },
    surface: {
      accent: '#FCE9E1',
      base: '#F8F7F4',
      inset: '#F4F4F2',
      panel: '#FFFFFF',
      paper: '#FFFFFF',
      paperMuted: '#F1F0EC',
      shell: '#F8F7F4',
      sidebar: '#F8F7F4',
      soft: '#F1F0EC',
      subtle: '#F4F4F2',
      warning: '#FCE9E1',
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
