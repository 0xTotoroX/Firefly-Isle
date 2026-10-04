/**
 * [INPUT]: brand 的双语名称、Locale 类型与 cn。
 * [OUTPUT]: BrandWordmark 渲染登录页与侧栏共用的文字品牌。
 * [POS]: system 品牌基元；与图标分离，不依赖装饰字体或候选标志。
 * [PROTOCOL]: 依赖、导出或职责变化时更新本文及所属模块说明。
 */
import { brand } from '@/lib/brand'
import type { Locale } from '@/lib/locale'
import { cn } from '@/lib/utils'

type BrandWordmarkProps = {
  className?: string
  locale: Locale
  scale?: 'sidebar' | 'login'
  subtitle?: string
}

export function BrandWordmark({ className, locale, scale = 'sidebar', subtitle }: BrandWordmarkProps) {
  return (
    <span className={cn('block min-w-0', className)} data-brand-wordmark="true" data-brand-wordmark-scale={scale}>
      <span className={cn('block whitespace-nowrap font-[var(--ff-font-ui)] font-semibold tracking-normal text-[var(--ff-text-primary)]', scale === 'login' ? 'text-4xl leading-tight md:text-5xl' : locale === 'zh' ? 'text-2xl leading-8' : 'text-[22px] leading-8')}>
        {brand.name[locale]}
      </span>
      {subtitle ? <span className="mt-1 block text-sm leading-6 text-[var(--ff-text-secondary)]" data-brand-subtitle="true">{subtitle}</span> : null}
    </span>
  )
}
