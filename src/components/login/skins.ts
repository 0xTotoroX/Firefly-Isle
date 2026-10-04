/**
 * [INPUT]: 依赖 @/lib/theme 的 Theme 类型与 public/login 的双主题认证场景资产路径。
 * [OUTPUT]: 对外提供登录页入口与认证卡的 skin token、场景图片常量。
 * [POS]: components/login 的视觉材料表，被入口页、AuthCard 与 AuthOverlay 读取，不承载 JSX。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { Theme } from '@/lib/theme'

export const nightIslandAuthScene = '/login/night-island-auth-scene.png'
export const lightAuthScene = '/login/light-auth-flower-path.png'

export type LoginThemeSkin = {
  bodyCopy: string
  brandSubtitle: string
  brandTitle: string
  heading: string
  root: string
  section: string
  security: string
  utilityButton: string
  utilityDivider: string
  utilityShell: string
}

export const loginThemeSkins: Record<Theme, LoginThemeSkin> = {
  dark: {
    bodyCopy: 'text-white/62',
    brandSubtitle: 'text-white/58',
    brandTitle: 'text-[#f4f0e8] drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]',
    heading: 'text-[#f4f0e8] drop-shadow-[0_5px_22px_rgba(0,0,0,0.68)]',
    root: 'bg-[#02080a] text-[#f4f0e8]',
    section: 'bg-[#03090b]',
    security: 'text-white/58',
    utilityButton: 'hover:text-[#f4f0e8]',
    utilityDivider: 'bg-white/12',
    utilityShell: 'border-white/10 bg-white/[0.055] text-white/62 shadow-[inset_0_0_24px_rgba(255,255,255,0.035)]',
  },
  light: {
    bodyCopy: 'text-[#455c58]',
    brandSubtitle: 'text-[#516461]',
    brandTitle: 'text-[#172522] drop-shadow-[0_2px_16px_rgba(255,255,255,0.78)]',
    heading: 'text-[#172522] drop-shadow-[0_2px_18px_rgba(255,255,255,0.82)]',
    root: 'bg-[#f7fbfb] text-[#15201f]',
    section: 'bg-[#f7fbfb]',
    security: 'text-[#425754]/72',
    utilityButton: 'hover:text-[#142421]',
    utilityDivider: 'bg-[#8eaeb2]/32',
    utilityShell: 'border-[#a9c3c5]/50 bg-white/72 text-[#4a5f5c] shadow-[0_16px_42px_rgba(107,132,137,0.16)]',
  },
}

export type AuthCardSkin = {
  anonymousButton: string
  anonymousSubLabel: string
  body: string
  card: string
  closeButton: string
  divider: string
  dividerText: string
  field: string
  fieldIcon: string
  fieldInput: string
  fieldLabel: string
  feedbackNeutral: string
  feedbackSurface: string
  forgotLink: string
  hero: string
  heroGradient: string
  heroImage: string
  heroSubtitle: string
  heroTitle: string
  modeButton: string
  modeHint: string
  privacy: string
  privacyLink: string
  socialButton: string
  socialIcon: string
  socialLabel: string
  surface: string
  trailingIcon: string
}

export const authCardSkins: Record<Theme, AuthCardSkin> = {
  dark: {
    anonymousButton: 'border-white/10 bg-white/[0.035] text-white/70 hover:border-white/18 hover:text-white',
    anonymousSubLabel: 'text-white/40',
    body: 'bg-[linear-gradient(180deg,rgba(8,13,15,0.92),rgba(6,10,12,0.96))]',
    card: 'border-white/14 bg-[#050b0e]/90 text-[#f4f0e8] shadow-[0_30px_90px_rgba(0,0,0,0.52)] backdrop-blur-xl',
    closeButton: 'border-white/12 bg-black/24 text-white/66 hover:text-white',
    divider: 'bg-white/14',
    dividerText: 'text-white/44',
    feedbackNeutral: 'border-[var(--ff-border-default)] text-[var(--ff-text-secondary)]',
    feedbackSurface: 'bg-black/20',
    field: 'border-white/12 bg-[rgba(255,255,255,0.045)] focus-within:border-[var(--ff-accent-primary)]/52 focus-within:bg-[rgba(255,255,255,0.065)]',
    fieldIcon: 'text-white/56',
    fieldInput: 'text-[#f4f0e8] placeholder:text-white/40',
    fieldLabel: 'text-white/48',
    forgotLink: 'text-white/70 hover:text-white',
    hero: 'bg-[#050b0e]',
    heroGradient: 'bg-[radial-gradient(circle_at_68%_22%,rgba(255,169,77,0.16),transparent_20%),linear-gradient(180deg,rgba(5,9,11,0.30)_0%,rgba(5,9,11,0.02)_38%,rgba(5,9,11,0.35)_68%,rgba(5,9,11,0.96)_100%)]',
    heroImage: 'opacity-95',
    heroSubtitle: 'text-white/54',
    heroTitle: 'text-[#f4f0e8] drop-shadow-[0_4px_18px_rgba(0,0,0,0.7)]',
    modeButton: 'text-white/76 hover:text-white',
    modeHint: 'text-white/42',
    privacy: 'bg-white/[0.045] text-white/52',
    privacyLink: 'text-white/78',
    socialButton: 'border-[#353b3b] bg-[rgba(255,255,255,0.035)] text-[#d9d1c4] shadow-[inset_0_0_22px_rgba(255,255,255,0.018)] hover:border-[#6c665c] hover:bg-white/[0.055]',
    socialIcon: 'bg-white shadow-[0_0_18px_rgba(255,255,255,0.08)]',
    socialLabel: 'text-[#d8d0c4]',
    surface: 'bg-[linear-gradient(180deg,rgba(5,11,14,0),#050b0e)]',
    trailingIcon: 'text-white/56',
  },
  light: {
    anonymousButton: 'border-[#ccdadd] bg-white/76 text-[#4e625f] hover:border-[var(--ff-accent-primary)]/38 hover:text-[#172522]',
    anonymousSubLabel: 'text-[#81908d]',
    body: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.98))]',
    card: 'border-[#cbdcde] bg-white/92 text-[#172522] shadow-[0_30px_72px_rgba(98,124,129,0.22)]',
    closeButton: 'border-[#b6cacc]/70 bg-white/82 text-[#536865] shadow-[0_12px_26px_rgba(98,124,129,0.16)] hover:text-[#172522]',
    divider: 'bg-[#c8d8da]',
    dividerText: 'text-[#839592]',
    feedbackNeutral: 'border-[#cbdcde] text-[#526866]',
    feedbackSurface: 'bg-[#f7fbfb]',
    field: 'border-[#d5e2e3] bg-[#f8fbfb] focus-within:border-[var(--ff-accent-primary)]/52',
    fieldIcon: 'text-[#657b78]',
    fieldInput: 'text-[#172522] placeholder:text-[#8b9d9a]',
    fieldLabel: 'text-[#647a77]',
    forgotLink: 'text-[#516864] hover:text-[#172522]',
    hero: 'bg-[#eef7f7]',
    heroGradient: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.06)_42%,rgba(255,255,255,0.56)_70%,rgba(255,255,255,0.98)_100%)]',
    heroImage: 'opacity-82',
    heroSubtitle: 'text-[#647a77]',
    heroTitle: 'text-[#172522] drop-shadow-[0_2px_18px_rgba(255,255,255,0.86)]',
    modeButton: 'text-[#304a45] hover:text-[#172522]',
    modeHint: 'text-[#7b8f8c]',
    privacy: 'bg-[#f2f8f8] text-[#5d7471]',
    privacyLink: 'text-[#172522]',
    socialButton: 'border-[#d1dfe0] bg-white/82 text-[#334844] shadow-[0_12px_24px_rgba(98,124,129,0.08)] hover:border-[var(--ff-accent-primary)]/35 hover:bg-[#fffaf7]',
    socialIcon: 'bg-white shadow-[0_8px_18px_rgba(98,124,129,0.12)]',
    socialLabel: 'text-[#223530]',
    surface: 'bg-[linear-gradient(180deg,rgba(255,255,255,0),#ffffff)]',
    trailingIcon: 'text-[#657b78]',
  },
}
