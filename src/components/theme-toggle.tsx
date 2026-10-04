/**
 * [INPUT]: 依赖 lucide-react 图标、@/components/ui/button、@/lib/theme 的 useTheme 与 @/lib/copy 的主题切换文案。
 * [OUTPUT]: 对外提供 ThemeToggle 组件。
 * [POS]: components 的全局主题开关，与语言开关并列复用，但只负责 theme 状态。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { MoonStar, SunMedium } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { locale } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 border-border/80 bg-card/70 px-3 font-mono uppercase tracking-[0.22em] text-[11px]"
      onClick={toggleTheme}
    >
      {isDark ? <SunMedium className="size-3.5" /> : <MoonStar className="size-3.5" />}
      {isDark ? getCopy(copy.themeToggle.light, locale) : getCopy(copy.themeToggle.dark, locale)}
    </Button>
  )
}
