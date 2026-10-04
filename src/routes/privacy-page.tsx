/**
 * [INPUT]: 依赖 react 的 CSSProperties、@/components/app-shell 的 ClinicalTopBar、@/components/system/surfaces 的 MainShell 与 PanelSurface、@/lib/privacy 的共享隐私条款真相源、@/lib/theme 的 useTheme、03 Apple Editorial 标题字体合同与 transitions-dev.css 的 route/stagger/control 动效合同。
 * [OUTPUT]: 对外提供 PrivacyPage 组件，对应 /privacy，并以克制顺序进入呈现隐私条款。
 * [POS]: routes 的独立隐私条款页，消费 V3 topbar、surface、motion 与 typography 语言，并与隐私门控共享同一文案来源。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { ClinicalTopBar } from '@/components/app-shell'
import { MainShell, PanelSurface } from '@/components/system/surfaces'
import {
  PRIVACY_PAGE_HREF,
  PRIVACY_POLICY_ITEMS,
  PRIVACY_POLICY_SUMMARY,
} from '@/lib/privacy'
import { useTheme } from '@/lib/theme'
import { topBarOffsetClass } from '@/lib/theme/tokens'

export function PrivacyPage() {
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]">
      <ClinicalTopBar theme={theme} title="隐私条款" />
      <MainShell className={`${topBarOffsetClass} min-h-screen px-4 py-6 md:px-8 md:py-10`} theme={theme}>
        <div className="t-route-reveal mx-auto flex w-full max-w-[1180px] flex-col gap-6">
          <PanelSurface
            className="t-stagger p-8 md:p-12"
            theme={theme}
            tone="panel"
            style={{ '--t-order': 0 } as CSSProperties}
          >
            <div className="mb-5 inline-flex rounded-[var(--ff-radius-sm)] border border-[var(--ff-accent-primary)] px-3 py-1 font-[var(--ff-font-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--ff-accent-text)]">
              Privacy Notice
            </div>
            <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-normal md:text-6xl">
              隐私条款与数据使用说明
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--ff-text-secondary)] md:text-lg">
              {PRIVACY_POLICY_SUMMARY}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--ff-border-default)] pt-6">
              <Link
                className="t-control-press inline-flex h-12 items-center justify-center rounded-[var(--ff-radius-md)] bg-[var(--ff-accent-primary)] px-6 text-sm font-bold text-[var(--ff-accent-foreground)] transition-colors hover:bg-[var(--ff-accent-strong)]"
                to="/login"
              >
                返回登录
              </Link>
              <Link
                className="t-control-press inline-flex h-12 items-center justify-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-6 text-sm font-semibold text-[var(--ff-text-primary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)]"
                to={PRIVACY_PAGE_HREF}
              >
                当前页面链接
              </Link>
            </div>
          </PanelSurface>

          <section aria-label="隐私条款明细" className="grid gap-4 md:grid-cols-3">
            {PRIVACY_POLICY_ITEMS.map((item, index) => (
              <PanelSurface
                className="t-stagger p-6 md:p-8"
                key={item.title}
                theme={theme}
                tone="panel"
                style={{ '--t-order': index + 1 } as CSSProperties}
              >
                <div className="font-[var(--ff-font-mono)] text-[12px] text-[var(--ff-accent-text)]">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-normal">{item.title}</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--ff-text-secondary)]">{item.body}</p>
              </PanelSurface>
            ))}
          </section>

          <PanelSurface
            className="t-stagger p-8 md:p-10"
            theme={theme}
            tone="inset"
            style={{ '--t-order': 4 } as CSSProperties}
          >
            <h2 className="font-[var(--ff-font-display)] text-2xl font-bold tracking-normal text-[var(--ff-text-primary)]">
              Accessibility & Scope
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--ff-text-secondary)]">
              <p>本页为独立可访问的产品入口隐私条款页面，便于用户在首次弹窗之外再次查阅。</p>
              <p>应用内首次进入时展示的隐私门控与本页共享同一份文案来源，避免页面与弹窗出现相互漂移的说明。</p>
              <p>当前文本仅作为 MVP 上线前占位版本，正式上线前仍需法务审核。</p>
            </div>
          </PanelSurface>
        </div>
      </MainShell>
    </div>
  )
}
