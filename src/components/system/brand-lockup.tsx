/**
 * [INPUT]: 依赖 react 的 ReactNode/CSSProperties 类型，依赖 @/lib/theme 的 themeTokens，依赖 @/lib/utils 的 cn。
 * [OUTPUT]: 对外提供 BrandLockup、BrandLockupVariant、brandLockupVariants 与 BRAND_LOCKUP_VARIANT_META。
 * [POS]: src/components/system 的品牌锁定组合候选组件，用于 /brand-lockup-preview 同屏比较萤火虫品牌区的 full-label、icon-only、dark、light 状态，不替换生产侧栏。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { type CSSProperties, type ReactNode } from 'react'

import { themeTokens } from '@/lib/theme/tokens'
import { cn } from '@/lib/utils'

export const brandLockupVariants = [
  'clinical-crest',
  'firefly-specimen',
  'vertical-beacon',
  'data-wing',
  'ink-seal',
  'minimal-spine',
] as const

export type BrandLockupVariant = (typeof brandLockupVariants)[number]

type BrandLockupMode = 'expanded' | 'icon'
type BrandLockupTheme = 'dark' | 'light'

type BrandLockupProps = {
  mode: BrandLockupMode
  theme: BrandLockupTheme
  variant: BrandLockupVariant
}

type VariantMeta = {
  eyebrow: string
  name: string
  note: string
  title: string
}

export const BRAND_LOCKUP_VARIANT_META: Record<BrandLockupVariant, VariantMeta> = {
  'clinical-crest': {
    eyebrow: 'Firefly crest',
    name: 'Clinical Crest',
    note: '单对翅鞘的萤火虫收进医疗徽章里，尾光和星空更稳重。',
    title: '萤火徽章',
  },
  'firefly-specimen': {
    eyebrow: 'Specimen tag',
    name: 'Firefly Specimen',
    note: '发光尾囊配标本编号，像被归档的一只夜间萤火虫。',
    title: '标本标签',
  },
  'vertical-beacon': {
    eyebrow: 'Night beacon',
    name: 'Vertical Beacon',
    note: '把尾部微光当成夜航信标，窄侧栏也有方向感。',
    title: '竖向信标',
  },
  'ink-seal': {
    eyebrow: 'Glow seal',
    name: 'Ink Seal',
    note: '中文档案章里藏一只单对翅鞘的萤火虫，减少卡通感。',
    title: '墨印档案',
  },
  'data-wing': {
    eyebrow: 'Trace dots',
    name: 'Trace Dots',
    note: '4 号方向：Mark 独立成一只萤火虫，点状轨迹表达数据连接，标题独立使用。',
    title: '萤迹之点',
  },
  'minimal-spine': {
    eyebrow: 'Quiet glow',
    name: 'Minimal Spine',
    note: '最克制的一只萤火虫、短字标和细碎星空，长期耐看。',
    title: '极简尾光',
  },
}

function tokenStyle(theme: BrandLockupTheme) {
  const tokens = themeTokens[theme]

  return {
    '--ff-accent-primary': tokens.accent.primary,
    '--ff-accent-soft': tokens.accent.soft,
    '--ff-accent-strong': tokens.accent.strong,
    '--ff-border-default': tokens.border.default,
    '--ff-border-muted': tokens.border.muted,
    '--ff-surface-base': tokens.surface.base,
    '--ff-surface-inset': tokens.surface.inset,
    '--ff-surface-panel': tokens.surface.panel,
    '--ff-surface-sidebar': tokens.surface.sidebar,
    '--ff-surface-soft': tokens.surface.soft,
    '--ff-text-muted': tokens.text.muted,
    '--ff-text-primary': tokens.text.primary,
    '--ff-text-secondary': tokens.text.secondary,
  } as CSSProperties
}

function StarField() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute left-[12%] top-[17%] h-1 w-1 rounded-[var(--ff-radius-full)] bg-white/70" />
      <span className="absolute left-[37%] top-[10%] h-[2px] w-[2px] rounded-[var(--ff-radius-full)] bg-white/45" />
      <span className="absolute left-[70%] top-[16%] h-[3px] w-[3px] rounded-[var(--ff-radius-full)] bg-white/55" />
      <span className="absolute left-[83%] top-[59%] h-[3px] w-[3px] rounded-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)]" />
      <span className="absolute left-[25%] top-[80%] h-[3px] w-[3px] rounded-[var(--ff-radius-full)] bg-white/45" />
      <span className="absolute left-[62%] top-[82%] h-[2px] w-[2px] rounded-[var(--ff-radius-full)] bg-white/35" />
    </span>
  )
}

function LockupSky({ theme }: { theme: BrandLockupTheme }) {
  const isDark = theme === 'dark'

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className={cn(
          'absolute inset-0',
          isDark
            ? 'bg-[#0b0e0f]'
            : 'bg-[#fbfaf7]',
        )}
      />
      <span className={cn('absolute left-[10%] top-[18%] h-1 w-1 rounded-[var(--ff-radius-full)]', isDark ? 'bg-white/60' : 'bg-[#233039]/24')} />
      <span className={cn('absolute left-[18%] top-[42%] h-[2px] w-[2px] rounded-[var(--ff-radius-full)]', isDark ? 'bg-white/42' : 'bg-[#233039]/18')} />
      <span className="absolute left-[22%] top-[76%] h-[3px] w-[3px] rounded-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)]" />
      <span className={cn('absolute left-[48%] top-[28%] h-[3px] w-[3px] rounded-[var(--ff-radius-full)]', isDark ? 'bg-white/50' : 'bg-[#233039]/20')} />
      <span className={cn('absolute left-[82%] top-[19%] h-1 w-1 rounded-[var(--ff-radius-full)]', isDark ? 'bg-white/55' : 'bg-[#233039]/22')} />
      <span className="absolute left-[86%] top-[68%] h-[3px] w-[3px] rounded-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)]" />
      <span className={cn('absolute left-[64%] top-[82%] h-[2px] w-[2px] rounded-[var(--ff-radius-full)]', isDark ? 'bg-white/38' : 'bg-[#233039]/16')} />
    </span>
  )
}

function MarkShell({ children, mode, variant }: { children: ReactNode; mode: BrandLockupMode; variant: BrandLockupVariant }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden border border-[var(--ff-border-default)] bg-[#0b0e0f] text-[var(--ff-accent-text)]',
        mode === 'icon' ? 'h-11 w-11' : 'h-12 w-12',
        variant === 'ink-seal' ? 'rounded-[2px]' : variant === 'minimal-spine' ? 'rounded-[var(--ff-radius-sm)]' : 'rounded-[var(--ff-radius-md)]',
      )}
    >
      <StarField />
      {children}
    </span>
  )
}

function FireflyGlyph({ mode, variant }: { mode: BrandLockupMode; variant: BrandLockupVariant }) {
  const compact = mode === 'icon'
  const traceDots = variant === 'data-wing'
  const tilt =
    variant === 'vertical-beacon'
      ? '-3 32 32'
      : variant === 'ink-seal'
        ? '0 32 32'
        : variant === 'minimal-spine'
          ? '-8 32 32'
          : '-10 32 32'

  return (
    <MarkShell mode={mode} variant={variant}>
      <svg className={compact ? 'relative h-[42px] w-[42px]' : 'relative h-[46px] w-[46px]'} viewBox="0 0 64 64">
        <g transform={`rotate(${tilt})`}>
          <circle cx="32" cy="45.5" fill="#ff7a1c" opacity="0.18" r="16" />
          <path
            d="M29.4 25.6C22 13.4 11.2 8.9 8 15.9c-3.2 7.2 5.5 16.6 19.5 14.8 2.4-.3 3.3-2.8 1.9-5.1Z"
            fill="#e85d2a"
            opacity="0.92"
            stroke="var(--ff-accent-primary)"
            strokeWidth="1.1"
          />
          <path
            d="M34.6 25.6C42 13.4 52.8 8.9 56 15.9c3.2 7.2-5.5 16.6-19.5 14.8-2.4-.3-3.3-2.8-1.9-5.1Z"
            fill="#e85d2a"
            opacity="0.84"
            stroke="var(--ff-accent-primary)"
            strokeWidth="1.1"
          />
          <path d="M19.2 17.4c3.8 2.6 6.6 5.7 8.6 9.3M44.8 17.4c-3.8 2.6-6.6 5.7-8.6 9.3" fill="none" opacity="0.56" stroke="#0b0e0f" strokeLinecap="round" strokeWidth="1" />
          <path
            d="M32 19.8c4.6 3.4 6.9 9.3 6.4 16.8-.4 6.4-2.8 13.1-6.4 17.9-3.6-4.8-6-11.5-6.4-17.9-.5-7.5 1.8-13.4 6.4-16.8Z"
            fill="#190b07"
            stroke="#ff8744"
            strokeWidth="1.3"
          />
          <path
            d="M28.5 34.8h7M29.5 40.3h5M31.9 24.2v27"
            fill="none"
            opacity="0.7"
            stroke="#ff8744"
            strokeLinecap="round"
            strokeWidth="1"
          />
          <ellipse
            cx="32"
            cy="45.2"
            fill="var(--ff-accent-strong)"
            rx="5.9"
            ry="8.2"
            stroke="#ffd36a"
            strokeWidth="1"
          />
          <circle cx="32" cy="17.4" fill="#190b07" r="4.3" stroke="#ff8744" strokeWidth="1.2" />
          <path d="M29.8 14.1c-3.3-4.1-7.3-5.8-12-5M34.2 14.1c3.3-4.1 7.3-5.8 12-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
          {traceDots ? (
            <>
              <path
                d="M43.5 33.5c8.8 3 12.1 11 7.9 17.1-3.1 4.6-9.2 6.4-15.8 4.7"
                fill="none"
                stroke="#ffb23e"
                strokeDasharray="2.6 5.2"
                strokeLinecap="round"
                strokeWidth="1.7"
              />
              <circle cx="46.5" cy="35.2" fill="#ffb23e" r="2.1" />
              <circle cx="52.4" cy="42.8" fill="#ffb23e" r="2.4" />
              <circle cx="50.3" cy="51.5" fill="#ffb23e" r="2.1" />
              <circle cx="36.2" cy="55.3" fill="none" r="4.1" stroke="var(--ff-accent-primary)" strokeWidth="2.4" />
            </>
          ) : (
            <>
              <circle cx="18.4" cy="54.2" fill="var(--ff-accent-primary)" r="1.35" />
              <circle cx="13" cy="57.1" fill="var(--ff-accent-primary)" opacity="0.72" r="1.05" />
              <circle cx="24.8" cy="58" fill="var(--ff-accent-primary)" opacity="0.56" r="0.95" />
            </>
          )}
        </g>
      </svg>
    </MarkShell>
  )
}

function VariantMark({ mode, variant }: { mode: BrandLockupMode; variant: BrandLockupVariant }) {
  return <FireflyGlyph mode={mode} variant={variant} />
}

function Wordmark({ variant }: { variant: BrandLockupVariant }) {
  const meta = BRAND_LOCKUP_VARIANT_META[variant]

  if (variant === 'ink-seal') {
    return (
      <span className="min-w-0">
        <span className="block font-[var(--ff-font-display)] text-[20px] font-black leading-none tracking-normal text-[var(--ff-text-primary)]">
          一页萤屿
        </span>
        <span className="mt-1 block font-[var(--ff-font-mono)] text-[8px] uppercase tracking-[0.2em] text-[var(--ff-text-muted)]">
          Ink Archive
        </span>
      </span>
    )
  }

  if (variant === 'vertical-beacon' || variant === 'minimal-spine') {
    return (
      <span className="min-w-0">
        <span className="block text-[18px] font-black leading-none tracking-normal text-[var(--ff-text-primary)]">一页萤屿</span>
        <span className="mt-1 block font-[var(--ff-font-mono)] text-[8px] uppercase tracking-[0.18em] text-[var(--ff-text-muted)]">
          {meta.eyebrow}
        </span>
      </span>
    )
  }

  return (
    <span className="min-w-0">
      <span className="block text-[19px] font-black leading-none tracking-normal text-[var(--ff-text-primary)]">一页萤屿</span>
      <span className="mt-1 block font-[var(--ff-font-mono)] text-[8px] uppercase tracking-[0.2em] text-[var(--ff-text-muted)]">
        {meta.eyebrow}
      </span>
    </span>
  )
}

function containerClass(variant: BrandLockupVariant, mode: BrandLockupMode) {
  const base =
    'relative flex min-w-0 items-center overflow-hidden border text-left transition-[border-color,box-shadow,transform] duration-200'
  const width = mode === 'icon' ? 'w-[72px] justify-center px-3 py-3' : 'w-[148px] gap-2 px-2.5 py-2.5'

  if (variant === 'clinical-crest') {
    return cn(base, width, 'rounded-[var(--ff-radius-md)] border-[var(--ff-border-default)] border-l-[3px] border-l-[var(--ff-accent-primary)] bg-[var(--ff-surface-panel)]')
  }

  if (variant === 'firefly-specimen') {
    return cn(base, width, 'rounded-[var(--ff-radius-sm)] border-dashed border-[var(--ff-border-default)] bg-[var(--ff-surface-sidebar)]')
  }

  if (variant === 'vertical-beacon') {
    return cn(base, width, 'rounded-[var(--ff-radius-md)] border-transparent bg-[color:color-mix(in_srgb,var(--ff-accent-primary)_10%,transparent)]')
  }

  if (variant === 'ink-seal') {
    return cn(base, width, 'rounded-[2px] border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] shadow-[inset_0_0_0_1px_var(--ff-border-muted)]')
  }

  if (variant === 'data-wing') {
    return cn(base, width, 'rounded-[var(--ff-radius-md)] border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]')
  }

  return cn(base, width, 'rounded-[var(--ff-radius-sm)] border-transparent bg-transparent')
}

export function BrandLockup({ mode, theme, variant }: BrandLockupProps) {
  const meta = BRAND_LOCKUP_VARIANT_META[variant]
  const iconOnly = mode === 'icon'

  return (
    <div
      aria-label={`${meta.name} ${theme} ${mode}`}
      className={cn(
        'relative grid min-h-[92px] place-items-start overflow-hidden border border-[var(--ff-border-default)] bg-[var(--ff-surface-sidebar)] p-4 text-[var(--ff-text-primary)]',
      )}
      style={tokenStyle(theme)}
    >
      <LockupSky theme={theme} />
      <div className={cn(containerClass(variant, mode), 'z-10')}>
        <VariantMark mode={mode} variant={variant} />
        {iconOnly ? null : <Wordmark variant={variant} />}
      </div>
    </div>
  )
}
