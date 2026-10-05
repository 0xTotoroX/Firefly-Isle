/**
 * [INPUT]: 依赖 react-router-dom 的 Link，依赖 @/components/app-shell 的 V3 壳层、@/components/system 的 surfaces，依赖 LlmProviderSettingsPanel 的自带密钥表单、@/lib/model-catalog 的目录真相源、copy 字典、locale/theme 与 theme tokens。
 * [OUTPUT]: 对外提供 ModelsPage 组件，对应 /models。
 * [POS]: routes 的模型配置页，按 Codex++ 目录协议展示默认模型目录（文字 deepseek-v4-flash / 图像 deepseek-flash），并承载从工作区输入区迁移过来的自带密钥设置面板。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useDemoSession, useProductPath } from '@/lib/demo-session'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { Link } from 'react-router-dom'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { MainShell } from '@/components/system/surfaces'
import { LlmProviderSettingsPanel } from '@/components/workspace/llm-provider-settings-panel'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { useTheme } from '@/lib/theme'
import { listVisibleModels } from '@/lib/model-catalog'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'

const DEFAULT_SLUGS = new Set(['deepseek-v4-flash', 'deepseek-flash'])

function ModalityBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-1.5 py-0.5 font-[var(--ff-font-mono)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ff-text-muted)]">
      {label}
    </span>
  )
}

type ModelsPageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

export function ModelsPage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: ModelsPageProps) {
  const { locale } = useLocale()
  const demo = useDemoSession()
  const productPath = useProductPath()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const entries = listVisibleModels()

  return (
    <div className={dark ? 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]' : 'ff-light-record-bg min-h-screen text-[var(--ff-text-primary)]'}>
      <ClinicalTopBar theme={theme} title={getCopy(copy.models.title, locale)} withRail />
      <ArchiveSideNav
        dark={dark}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        userIsAnonymous={userIsAnonymous}
        userLabel={userLabel}
      />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className={`${shellWideContentClass} t-route-reveal mt-5 md:mt-6`}>
          <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">
            {getCopy(copy.models.eyebrow, locale)}
          </div>
          {demo ? <DemoModeBanner /> : null}
          <h1 className="mt-1 font-[var(--ff-font-display)] text-3xl font-black tracking-tight">{getCopy(copy.models.title, locale)}</h1>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-6">
            <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal">{getCopy(copy.models.catalogTitle, locale)}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ff-text-secondary)]">
              {getCopy(copy.models.catalogDescription, locale)}
            </p>
            <ul className="mt-4 space-y-2" data-testid="models-catalog-list">
              {entries.map((entry) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-4 py-3"
                  data-testid={`model-catalog-${entry.slug}`}
                  key={entry.slug}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-[var(--ff-font-display)] text-base font-bold">{entry.displayName}</span>
                      {DEFAULT_SLUGS.has(entry.slug) ? (
                        <span className="inline-flex items-center rounded-[var(--ff-radius-full)] border border-[color-mix(in_srgb,var(--ff-accent-primary)_46%,transparent)] px-2 py-0.5 font-[var(--ff-font-mono)] text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ff-accent-text)]">
                          default
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate font-[var(--ff-font-mono)] text-[11px] text-[var(--ff-text-muted)]">{entry.slug}</div>
                    <p className="mt-1 text-sm leading-5 text-[var(--ff-text-secondary)]">{entry.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {entry.inputModalities.map((modality) => (
                      <ModalityBadge
                        key={modality}
                        label={modality === 'text' ? getCopy(copy.models.modalityBadgeText, locale) : getCopy(copy.models.modalityBadgeImage, locale)}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-6">
            <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal">{getCopy(copy.models.providerTitle, locale)}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ff-text-secondary)]">
              {getCopy(copy.models.providerDescription, locale)}
            </p>
            <div className="mt-4">
              <LlmProviderSettingsPanel theme={theme} />
            </div>
          </section>

          <Link
            className="t-control-press mt-6 inline-flex min-h-[40px] items-center rounded-[12px] border border-[var(--ff-border-default)] px-4 text-sm font-bold text-[var(--ff-text-primary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)]"
            to={productPath('/settings')}
          >
            {getCopy(copy.settings.title, locale)}
          </Link>
        </div>
      </MainShell>
    </div>
  )
}
