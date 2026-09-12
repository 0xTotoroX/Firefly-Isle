/**
 * [INPUT]: 依赖 app-shell、copy 字典、auth session 与 billing-checkout Edge Function。
 * [OUTPUT]: 对外提供 DonatePage，对应 /donate。
 * [POS]: routes 的一次性捐赠页。功能全免费，这里只发起 Stripe payment checkout；未配置密钥时展示说明而不假装可支付。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react'

import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { MainShell } from '@/components/system/surfaces'
import { useAuth } from '@/lib/auth'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { getSupabaseClient, hasSupabaseEnv, hasSupabaseFunctionEnv, supabaseEdgeFunctionUrl } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { shellWideContentClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'

const PRESET_AMOUNTS = [1, 5, 10, 15, 20]

type DonatePageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

export function DonatePage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: DonatePageProps) {
  const { locale } = useLocale()
  const { theme } = useTheme()
  const { user } = useAuth()
  const dark = theme === 'dark'
  const [amount, setAmount] = useState(15)
  const [custom, setCustom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = custom.trim() ? Number(custom) : amount
  const amountCents = Number.isFinite(selected) ? Math.round(selected * 100) : 0

  async function handleDonate() {
    if (amountCents < 100 || amountCents > 100_000) {
      setError(getCopy(copy.donate.failed, locale))
      return
    }

    if (!hasSupabaseEnv || !hasSupabaseFunctionEnv || !user) {
      setError(getCopy(copy.donate.disabled, locale))
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data, error: sessionError } = await getSupabaseClient().auth.getSession()
      const token = data.session?.access_token

      if (sessionError || !token) {
        setError(getCopy(copy.donate.disabled, locale))
        return
      }

      const response = await fetch(`${supabaseEdgeFunctionUrl.replace(/\/$/, '')}/billing-checkout`, {
        body: JSON.stringify({ amountCents }),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await response.json()) as { checkoutUrl?: string; error?: { name?: string } }

      if (!response.ok || !payload.checkoutUrl) {
        setError(payload.error?.name === 'BILLING_DISABLED' ? getCopy(copy.donate.disabled, locale) : getCopy(copy.donate.failed, locale))
        return
      }

      window.location.assign(payload.checkoutUrl)
    } catch {
      setError(getCopy(copy.donate.failed, locale))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={dark ? 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]' : 'min-h-screen bg-[var(--ff-surface-base)] text-[var(--ff-text-primary)]'}>
      <ClinicalTopBar theme={theme} title={getCopy(copy.donate.title, locale)} withRail />
      <ArchiveSideNav dark={dark} isSigningOut={isSigningOut} onSignOut={onSignOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen px-4 pb-8 md:px-6 md:pb-10`} theme={theme}>
        <div className={`${shellWideContentClass} t-route-reveal mt-5 max-w-2xl md:mt-6`}>
          <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.donate.eyebrow, locale)}</div>
          <h1 className="mt-1 font-[var(--ff-font-display)] text-3xl font-black tracking-tight">{getCopy(copy.donate.title, locale)}</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.donate.description, locale)}</p>

          <section className="mt-6 rounded-[var(--ff-radius-lg)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-6">
            <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-text-muted)]">{getCopy(copy.donate.amountLabel, locale)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((value) => (
                <button
                  aria-pressed={!custom && amount === value}
                  className="t-control-press min-h-[38px] rounded-[var(--ff-radius-md)] border px-4 text-sm font-semibold aria-pressed:border-[var(--ff-accent-primary)] aria-pressed:text-[var(--ff-accent-text)]"
                  key={value}
                  onClick={() => {
                    setAmount(value)
                    setCustom('')
                  }}
                  type="button"
                >
                  ${value}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-semibold text-[var(--ff-text-secondary)]">
              {getCopy(copy.donate.customLabel, locale)}
              <input
                className="mt-2 w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 py-2 text-sm font-semibold outline-none focus-visible:border-[var(--ff-accent-primary)]"
                inputMode="decimal"
                onChange={(event) => setCustom(event.target.value)}
                placeholder={getCopy(copy.donate.customPlaceholder, locale)}
                type="number"
                value={custom}
              />
            </label>
            {error ? (
              <p className="mt-4 text-sm text-[var(--ff-accent-text)]" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="t-control-press mt-5 inline-flex min-h-[46px] items-center justify-center rounded-[14px] bg-[var(--ff-accent-primary)] px-6 text-base font-bold text-[var(--ff-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              onClick={() => void handleDonate()}
              type="button"
            >
              {submitting ? getCopy(copy.donate.submitting, locale) : getCopy(copy.donate.action, locale)}
            </button>
            <p className="mt-4 text-xs leading-5 text-[var(--ff-text-muted)]">{getCopy(copy.donate.note, locale)}</p>
          </section>
        </div>
      </MainShell>
    </div>
  )
}
