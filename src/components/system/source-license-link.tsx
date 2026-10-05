/**
 * [INPUT]: 页面传入的Locale与可选样式；构建装配提供同源静态/source/许可页面。
 * [OUTPUT]: 无需登录或接受隐私条款的SourceLicenseLink文本入口，不发送当前患者/分享路由。
 * [POS]: system的共用许可入口，供登录、隐私门控和共享顶栏复用。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { cn } from '@/lib/utils'

export function SourceLicenseLink({ locale, className }: { locale: 'zh' | 'en'; className?: string }) {
  return (
    <a
      className={cn('inline-flex min-h-10 shrink-0 items-center whitespace-nowrap text-sm text-[var(--ff-text-secondary)] underline decoration-[var(--ff-border-default)] underline-offset-4 hover:text-[var(--ff-text-primary)]', className)}
      data-source-license-link="true"
      href="/source/index.html"
      referrerPolicy="no-referrer"
    >
      {locale === 'zh' ? '源码与许可' : 'Source & license'}
    </a>
  )
}
