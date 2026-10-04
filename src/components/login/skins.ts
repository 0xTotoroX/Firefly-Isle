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

const loginSkin: LoginThemeSkin = {
  bodyCopy: 'text-[var(--ff-text-secondary)]',
  brandSubtitle: 'text-[var(--ff-text-secondary)]',
  brandTitle: 'text-[var(--ff-text-primary)]',
  heading: 'text-[var(--ff-text-primary)]',
  root: 'bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]',
  section: 'bg-[var(--ff-surface-base)]',
  security: 'text-[var(--ff-text-secondary)]',
  utilityButton: 'hover:text-[var(--ff-text-primary)]',
  utilityDivider: 'bg-[var(--ff-border-default)]',
  utilityShell: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] text-[var(--ff-text-secondary)]',
}

export const loginThemeSkins: Record<Theme, LoginThemeSkin> = { dark: loginSkin, light: loginSkin }

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

const authCardSkin: AuthCardSkin = {
  anonymousButton: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] text-[var(--ff-text-secondary)] hover:text-[var(--ff-text-primary)]',
  anonymousSubLabel: 'text-[var(--ff-text-secondary)]',
  body: 'bg-[var(--ff-surface-panel)]',
  card: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] text-[var(--ff-text-primary)] shadow-xl',
  closeButton: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] text-[var(--ff-text-primary)]',
  divider: 'bg-[var(--ff-border-default)]',
  dividerText: 'text-[var(--ff-text-secondary)]',
  feedbackNeutral: 'border-[var(--ff-border-default)] text-[var(--ff-text-secondary)]',
  feedbackSurface: 'bg-[var(--ff-surface-inset)]',
  field: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] focus-within:border-[var(--ff-accent-text)]',
  fieldIcon: 'text-[var(--ff-text-secondary)]',
  fieldInput: 'text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)]',
  fieldLabel: 'text-[var(--ff-text-secondary)]',
  forgotLink: 'text-[var(--ff-accent-text)] underline-offset-4 hover:underline',
  hero: 'bg-[var(--ff-surface-inset)]',
  heroGradient: 'bg-[linear-gradient(180deg,transparent,var(--ff-surface-panel))]',
  heroImage: 'opacity-75',
  heroSubtitle: 'text-[var(--ff-text-secondary)]',
  heroTitle: 'text-[var(--ff-text-primary)]',
  modeButton: 'text-[var(--ff-text-primary)]',
  modeHint: 'text-[var(--ff-text-secondary)]',
  privacy: 'bg-[var(--ff-surface-inset)] text-[var(--ff-text-secondary)]',
  privacyLink: 'text-[var(--ff-accent-text)]',
  socialButton: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] text-[var(--ff-text-primary)] hover:bg-[var(--ff-surface-inset)]',
  socialIcon: 'bg-white',
  socialLabel: 'text-[var(--ff-text-primary)]',
  surface: 'bg-[linear-gradient(180deg,transparent,var(--ff-surface-panel))]',
  trailingIcon: 'text-[var(--ff-text-secondary)]',
}

export const authCardSkins: Record<Theme, AuthCardSkin> = { dark: authCardSkin, light: authCardSkin }
