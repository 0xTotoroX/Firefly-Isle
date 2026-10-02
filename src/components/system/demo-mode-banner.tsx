/**
 * [INPUT]: 演示会话、语言与主题状态。
 * [OUTPUT]: 统一演示说明、重置与明确退出入口。
 * [POS]: 所有 Demo 页面共用的会话提示，不接触真实账户。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { DEMO_DISCLOSURE } from '@/lib/demo-fixtures'
import { useDemoSession } from '@/lib/demo-session'
import { useLocale } from '@/lib/locale'
import { useTheme } from '@/lib/theme'
import { defaultAccentHex } from '@/lib/accent'

export function DemoModeBanner() {
  const demo = useDemoSession()
  const { locale, setLocale } = useLocale()
  const { setTheme, setAccent } = useTheme()
  return <section aria-label="演示模式" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[var(--ff-border-muted)] py-3 text-sm text-[var(--ff-text-secondary)]" data-testid="demo-mode-banner">
    <strong className="text-[var(--ff-accent-text)]">{locale === 'zh' ? '演示模式' : 'Demo'}</strong>
    <p className="min-w-0 flex-1 basis-64">{locale === 'zh' ? DEMO_DISCLOSURE : 'Fictional data. Changes last for this demo session; refresh or reset restores the examples. AI and OCR use fixed examples.'}</p>
    <button className="min-h-[44px] font-semibold hover:underline" onClick={() => { demo?.session.reset(); setLocale('zh'); setTheme('dark'); setAccent(defaultAccentHex) }} type="button">{locale === 'zh' ? '重置演示' : 'Reset demo'}</button>
    <a className="inline-flex min-h-[44px] items-center font-semibold hover:underline" href="/login">{locale === 'zh' ? '退出演示' : 'Exit demo'}</a>
  </section>
}
