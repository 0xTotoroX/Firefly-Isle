/**
 * [INPUT]: 依赖 react 的状态，依赖 react-router-dom 的 useLocation，依赖 @/components/app-shell 的 V3 壳层、@/components/system 的 surfaces，依赖 useAuth 的 session 真相源、useLocale/useTheme 的本地偏好 setter、async-resource 的档案加载基元、profile-settings 的档案读写、copy 字典与 theme tokens。
 * [OUTPUT]: 对外提供 SettingsPage 组件，对应 /settings。
 * [POS]: routes 的账户设置 orchestration 层，负责账户身份展示、显示名称/界面语言/外观主题的读写，档案服务缺失时降级为本地偏好并明示。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useDemoSession } from '@/lib/demo-session'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { MainShell } from '@/components/system/surfaces'
import { useAsyncResource } from '@/lib/async-resource'
import { useOptionalAuth } from '@/lib/auth'
import { copy, getCopy } from '@/lib/copy'
import { useLocale, type Locale } from '@/lib/locale'
import { getOnlineRequiredMessage } from '@/lib/network-status'
import { accentPresets } from '@/lib/accent'
import { useTheme, type Theme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import { getUserProfile, ProfileSettingsError, saveUserProfile, deleteOwnAccount } from '@/lib/profile-settings'
import { downloadAccountDataExport } from '@/lib/account-data-export'

const SETTINGS_OPTION_CLASS =
  't-control-press min-h-[38px] rounded-[var(--ff-radius-md)] border px-4 text-sm font-semibold transition-colors aria-pressed:border-[var(--ff-accent-primary)] aria-pressed:text-[var(--ff-accent-text)]'

function SettingsField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

type SettingsPageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

export function SettingsPage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: SettingsPageProps) {
  const user = useOptionalAuth()?.user
  const demo = useDemoSession()
  const { locale, setLocale } = useLocale()
  const { accent, setAccent, theme, setTheme } = useTheme()
  const dark = theme === 'dark'
  const resource = useAsyncResource(() => demo ? demo.session.loadProfile() : getUserProfile(), [demo?.session])
  const [displayName, setDisplayName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (resource.data) {
      setDisplayName(resource.data.displayName ?? '')
    }
  }, [resource.data])

  const accountLabel = demo ? (locale === 'zh' ? '虚构演示账号' : 'Fictional demo account') : userIsAnonymous || user?.is_anonymous ? getCopy(copy.settings.anonymousLabel, locale) : user?.email ?? getCopy(copy.settings.anonymousLabel, locale)
  const profileUnavailable = !resource.isLoading && !resource.error && resource.data === null
  const loadFailed = Boolean(resource.error)

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)

    try {
      await (demo ? demo.session.saveProfile : saveUserProfile)({ displayName, locale, theme })
      setSaved(true)
    } catch (error: unknown) {
      setSaveError(
        error instanceof ProfileSettingsError && error.requiresOnline
          ? getOnlineRequiredMessage(locale)
          : getCopy(copy.settings.saveFailedFeedback, locale),
      )
    } finally {
      setSaving(false)
    }
  }

  function handleLocaleChange(nextLocale: Locale) {
    setLocale(nextLocale)

    if (resource.data) {
      void (demo ? demo.session.saveProfile : saveUserProfile)({ locale: nextLocale }).catch(() => undefined)
    }
  }

  function handleThemeChange(nextTheme: Theme) {
    setTheme(nextTheme)

    if (resource.data) {
      void (demo ? demo.session.saveProfile : saveUserProfile)({ theme: nextTheme }).catch(() => undefined)
    }
  }

  async function handleExport() {
    setExporting(true)
    setExportError(null)

    try {
      if (demo) {
        const url = URL.createObjectURL(new Blob([JSON.stringify({ demo: true, disclosure: '完全虚构的演示资料', ...demo.session.getState() }, null, 2)], { type: 'application/json' }))
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'firefly-demo-data.json'
        anchor.click()
        URL.revokeObjectURL(url)
      } else await downloadAccountDataExport()
    } catch (error: unknown) {
      setExportError(
        error instanceof ProfileSettingsError && error.requiresOnline
          ? getOnlineRequiredMessage(locale)
          : getCopy(copy.settings.exportFailedFeedback, locale),
      )
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    if (demo) return
    if (deleteConfirmText !== getCopy(copy.settings.deleteConfirmWord, locale)) {
      setDeleteError(getCopy(copy.settings.deleteConfirmMismatch, locale))
      return
    }

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteOwnAccount()
      onSignOut?.()
    } catch (error: unknown) {
      setDeleteError(getCopy(copy.settings.deleteFailedFeedback, locale))
      void error
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={dark ? 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]' : 'ff-light-record-bg min-h-screen text-[var(--ff-text-primary)]'}>
      <ClinicalTopBar theme={theme} title={getCopy(copy.settings.title, locale)} withRail />
      <ArchiveSideNav
        dark={dark}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        userIsAnonymous={userIsAnonymous}
        userLabel={userLabel}
      />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className={`${shellWideContentClass} t-route-reveal mt-5 md:mt-6`}>
          {demo ? <DemoModeBanner /> : null}
          <h1 className="font-[var(--ff-font-display)] text-3xl font-black tracking-tight">{getCopy(copy.settings.title, locale)}</h1>

          {loadFailed ? (
            <p className="mt-4 rounded-[var(--ff-radius-md)] border px-4 py-3 text-sm text-[var(--ff-text-secondary)]" role="alert">
              {getCopy(copy.settings.loadFailedFeedback, locale)}
            </p>
          ) : null}
          {profileUnavailable ? (
            <p className="mt-4 rounded-[var(--ff-radius-md)] border px-4 py-3 text-sm text-[var(--ff-text-secondary)]" role="status">
              {getCopy(copy.settings.profileUnavailable, locale)}
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-[var(--ff-radius-lg)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-6">
              <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-accent-text)]">
                {getCopy(copy.settings.accountSection, locale)}
              </div>
              <dl className="mt-4 space-y-4">
                <SettingsField label={getCopy(copy.settings.emailLabel, locale)}>
                  <div className="text-sm font-semibold">{accountLabel}</div>
                </SettingsField>
              </dl>
            </section>

            <section className="rounded-[var(--ff-radius-lg)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-6">
              <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-accent-text)]">
                {getCopy(copy.settings.profileSection, locale)}
              </div>
              <form
                className="mt-4 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSave()
                }}
              >
                <SettingsField label={getCopy(copy.settings.displayNameLabel, locale)}>
                  <input
                    className="w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 py-2 text-sm font-semibold outline-none focus-visible:border-[var(--ff-accent-primary)]"
                    data-testid="settings-display-name-input"
                    id="settings-display-name"
                    maxLength={60}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={getCopy(copy.settings.displayNamePlaceholder, locale)}
                    type="text"
                    value={displayName}
                  />
                </SettingsField>
                <SettingsField label={getCopy(copy.settings.localeLabel, locale)}>
                  <div className="flex gap-2">
                    <button
                      aria-pressed={locale === 'zh'}
                      className={SETTINGS_OPTION_CLASS}
                      data-testid="settings-locale-zh"
                      onClick={() => handleLocaleChange('zh')}
                      type="button"
                    >
                      {getCopy(copy.localeToggle.zh, locale)}
                    </button>
                    <button
                      aria-pressed={locale === 'en'}
                      className={SETTINGS_OPTION_CLASS}
                      data-testid="settings-locale-en"
                      onClick={() => handleLocaleChange('en')}
                      type="button"
                    >
                      {getCopy(copy.localeToggle.en, locale)}
                    </button>
                  </div>
                </SettingsField>
                <SettingsField label={getCopy(copy.settings.themeLabel, locale)}>
                  <div className="flex gap-2">
                    <button
                      aria-pressed={theme === 'dark'}
                      className={SETTINGS_OPTION_CLASS}
                      data-testid="settings-theme-dark"
                      onClick={() => handleThemeChange('dark')}
                      type="button"
                    >
                      {getCopy(copy.themeToggle.dark, locale)}
                    </button>
                    <button
                      aria-pressed={theme === 'light'}
                      className={SETTINGS_OPTION_CLASS}
                      data-testid="settings-theme-light"
                      onClick={() => handleThemeChange('light')}
                      type="button"
                    >
                      {getCopy(copy.themeToggle.light, locale)}
                    </button>
                  </div>
                </SettingsField>
                <SettingsField label={getCopy(copy.settings.accentLabel, locale)}>
                  <div className="flex flex-wrap gap-3">
                    {accentPresets.map((preset) => (
                      <button
                        aria-label={preset.label[locale]}
                        aria-pressed={accent.toUpperCase() === preset.hex}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-accent-primary)]"
                        data-testid={`settings-accent-${preset.id}`}
                        key={preset.id}
                        onClick={() => setAccent(preset.hex)}
                        title={preset.label[locale]}
                        type="button"
                      >
                        <span
                          className={`block h-5 w-5 rounded-full ${accent.toUpperCase() === preset.hex ? 'ring-2 ring-[var(--ff-text-primary)] ring-offset-2 ring-offset-[var(--ff-surface-panel)]' : ''}`}
                          style={{ background: preset.hex }}
                        />
                      </button>
                    ))}
                  </div>
                </SettingsField>

                {saveError ? (
                  <p className="text-sm text-[var(--ff-accent-text)]" role="alert">
                    {saveError}
                  </p>
                ) : null}
                {saved && !saveError ? (
                  <p className="text-sm text-[var(--ff-accent-success)]" role="status">
                    {getCopy(copy.settings.savedFeedback, locale)}
                  </p>
                ) : null}

                <button
                  className="t-control-press flex min-h-[46px] w-full items-center justify-center rounded-[14px] bg-[var(--ff-accent-primary)] px-5 text-base font-bold text-[var(--ff-accent-foreground)] transition-colors hover:bg-[var(--ff-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="settings-save-button"
                  disabled={saving || resource.isLoading}
                  type="submit"
                >
                  {saving ? getCopy(copy.settings.savingButton, locale) : getCopy(copy.settings.saveButton, locale)}
                </button>
              </form>
            </section>
          </div>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-panel)] p-6">
            <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">
              {getCopy(copy.settings.donateSection, locale)}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.donate.description, locale)}</p>
            {demo ? <p className="mt-4 text-sm">{locale === 'zh' ? '捐赠仅供预览，演示不发起付款。' : 'Donation preview only. Demo does not initiate payments.'}</p> : (
            <Link
              className="t-control-press mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[14px] bg-[var(--ff-accent-primary)] px-5 text-sm font-bold text-[var(--ff-accent-foreground)]"
              to="/donate"
            >
              {getCopy(copy.settings.donateLink, locale)}
            </Link>
            )}
          </section>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-panel)] p-6">
            <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-accent-text)]">
              {getCopy(copy.settings.privacySection, locale)}
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.settings.exportDescription, locale)}</p>
                {exportError ? (
                  <p className="mt-3 text-sm text-[var(--ff-accent-text)]" role="alert">
                    {exportError}
                  </p>
                ) : null}
                <button
                  className="t-control-press mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[14px] border border-[var(--ff-border-default)] px-5 text-sm font-bold text-[var(--ff-text-primary)] transition-colors hover:border-[var(--ff-accent-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="settings-export-button"
                  disabled={exporting}
                  onClick={() => void handleExport()}
                  type="button"
                >
                  {exporting ? getCopy(copy.settings.exportingButton, locale) : getCopy(copy.settings.exportButton, locale)}
                </button>
              </div>
              <div>
                <p className="text-sm leading-6 text-[var(--ff-text-secondary)]">{demo ? (locale === 'zh' ? '账户删除仅供预览，演示不能删除真实账户。' : 'Account deletion is unavailable in Demo.') : getCopy(copy.settings.deleteDescription, locale)}</p>
                <input
                  aria-label={getCopy(copy.settings.deleteConfirmLabel, locale)}
                  className="mt-3 w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 py-2 text-sm font-semibold outline-none focus-visible:border-[var(--ff-accent-primary)]"
                  data-testid="settings-delete-confirm-input"
                  disabled={Boolean(demo)}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder={getCopy(copy.settings.deleteConfirmLabel, locale)}
                  type="text"
                  value={deleteConfirmText}
                />
                {deleteError ? (
                  <p className="mt-3 text-sm text-[var(--ff-accent-text)]" role="alert">
                    {deleteError}
                  </p>
                ) : null}
                <button
                  className="t-control-press mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[14px] border border-[var(--ff-accent-primary)] px-5 text-sm font-bold text-[var(--ff-accent-text)] transition-colors hover:bg-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="settings-delete-button"
                  disabled={Boolean(demo) || deleting || deleteConfirmText !== getCopy(copy.settings.deleteConfirmWord, locale)}
                  onClick={() => void handleDeleteAccount()}
                  type="button"
                >
                  {deleting ? getCopy(copy.settings.deletingButton, locale) : getCopy(copy.settings.deleteButton, locale)}
                </button>
              </div>
            </div>
          </section>
        </div>
      </MainShell>
    </div>
  )
}
