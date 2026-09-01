/**
 * [INPUT]: 依赖 react 的 PropsWithChildren、useEffect、useState，依赖 react-router-dom 的 Link、useLocation，依赖 @/lib/privacy 的隐私文案、独立隐私页路由与 localStorage key，依赖 @/lib/theme 的 useTheme 与 @/lib/locale 的 useLocale、copy 字典的门控文案。
 * [OUTPUT]: 对外提供 PrivacyGate 组件。
 * [POS]: components 的全局隐私门控层，在用户本地确认前阻塞整个应用入口，保证窄视口可滚动确认，并为独立隐私页放行访问。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { type PropsWithChildren, useEffect, useState } from 'react'

import { Link, useLocation } from 'react-router-dom'
import { copy, getCopy } from '@/lib/copy'
import {
  PRIVACY_ACCEPTED_STORAGE_KEY,
  PRIVACY_PAGE_HREF,
  PRIVACY_POLICY_ITEMS,
  PRIVACY_POLICY_SUMMARY,
} from '@/lib/privacy'
import { useLocale } from '@/lib/locale'
import { useTheme } from '@/lib/theme'

function readPrivacyAccepted() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(PRIVACY_ACCEPTED_STORAGE_KEY) === 'true'
}

function DarkPrivacyOverlay({ locale, onAccept, onStayBlocked }: { locale: 'zh' | 'en'; onAccept: () => void; onStayBlocked: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex min-h-screen items-start justify-center overflow-y-auto bg-[var(--ff-text-ink)]/96 p-4 text-[var(--ff-text-primary)] backdrop-blur-sm md:items-center md:p-6">
      <div className="w-full max-w-3xl border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] p-8 md:p-12">
        <div className="mb-4 inline-block border border-[var(--ff-border-default)] bg-[var(--ff-surface-accent)] px-3 py-1 font-[var(--ff-font-mono)] text-[11px] uppercase tracking-widest text-[var(--ff-accent-primary)]">
          {getCopy(copy.privacyGate.darkEyebrow, locale)}
        </div>
        <h2 className="font-[var(--ff-font-display)] text-[clamp(2rem,5vw,4rem)] font-black leading-[0.92] tracking-tighter">
          {getCopy(copy.privacyGate.darkHeading, locale)}
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--ff-text-secondary)] md:text-lg">
          {PRIVACY_POLICY_SUMMARY}
        </p>

        <div className="mt-8 grid gap-px bg-[var(--ff-border-default)] md:grid-cols-3">
          {PRIVACY_POLICY_ITEMS.map((item, index) => (
            <div className="bg-[var(--ff-surface-base)] p-5" key={item.title}>
              <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--ff-accent-primary)]">
                0{index + 1}
              </div>
              <div className="mt-3 font-[var(--ff-font-display)] text-lg font-bold tracking-normal">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-[var(--ff-text-secondary)]">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--ff-border-default)] pt-6 md:flex-row">
          <button
            className="flex-1 bg-[var(--ff-accent-primary)] px-6 py-4 font-[var(--ff-font-display)] text-sm font-black uppercase tracking-[0.2em] text-[var(--ff-surface-base)] transition-colors hover:bg-[var(--ff-text-primary)] hover:text-[var(--ff-text-ink)]"
            onClick={onAccept}
            type="button"
          >
            {getCopy(copy.privacyGate.darkAccept, locale)}
          </button>
          <Link
            className="flex flex-1 items-center justify-center border border-[var(--ff-border-default)] px-6 py-4 font-[var(--ff-font-mono)] text-[11px] uppercase tracking-[0.25em] text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-primary)]"
            to={PRIVACY_PAGE_HREF}
          >
            {getCopy(copy.privacyGate.fullPolicy, locale)}
          </Link>
          <button
            className="flex-1 border border-[var(--ff-border-default)] px-6 py-4 font-[var(--ff-font-mono)] text-[11px] uppercase tracking-[0.25em] text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-primary)]"
            onClick={onStayBlocked}
            type="button"
          >
            {getCopy(copy.privacyGate.darkDecline, locale)}
          </button>
        </div>
      </div>
    </div>
  )
}

function LightPrivacyOverlay({ locale, onAccept, onStayBlocked }: { locale: 'zh' | 'en'; onAccept: () => void; onStayBlocked: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex min-h-screen items-start justify-center overflow-y-auto bg-[var(--ff-surface-soft)]/96 p-4 text-[var(--ff-text-primary)] backdrop-blur-sm md:items-center md:p-6">
      <div className="ff-light-ink-shadow w-full max-w-3xl border-2 border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] p-8 md:p-12">
        <div className="mb-5 font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.35em] text-[var(--ff-text-muted)]">
          {getCopy(copy.privacyGate.lightEyebrow, locale)}
        </div>
        <h2 className="font-[var(--ff-font-display)] text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[0.92] tracking-tight">
          {getCopy(copy.privacyGate.lightHeading, locale)}
        </h2>
        <p className="mt-6 text-base leading-7 text-[var(--ff-text-secondary)] md:text-lg">{PRIVACY_POLICY_SUMMARY}</p>

        <div className="mt-8 space-y-4 border-y border-[var(--ff-border-default)] py-5">
          {PRIVACY_POLICY_ITEMS.map((item) => (
            <div className="flex items-start gap-3" key={item.title}>
              <span className="mt-1 h-2 w-2 shrink-0 bg-[var(--ff-text-primary)]" />
              <div>
                <p className="font-[var(--ff-font-display)] text-[10px] font-bold uppercase tracking-normal text-[var(--ff-text-muted)]">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--ff-text-subtle)]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <button
            className="border-2 border-[var(--ff-border-default)] bg-[var(--ff-text-primary)] px-6 py-4 font-[var(--ff-font-ui)] text-sm font-bold uppercase tracking-[0.2em] text-[var(--ff-surface-base)] transition-colors hover:bg-[var(--ff-surface-base)] hover:text-[var(--ff-text-primary)]"
            onClick={onAccept}
            type="button"
          >
            {getCopy(copy.privacyGate.lightAccept, locale)}
          </button>
          <Link
            className="flex items-center justify-center border-2 border-[var(--ff-border-default)] px-6 py-4 font-[var(--ff-font-ui)] text-sm font-bold uppercase tracking-[0.2em] text-[var(--ff-text-primary)] transition-colors hover:bg-[var(--ff-text-primary)] hover:text-[var(--ff-surface-base)]"
            to={PRIVACY_PAGE_HREF}
          >
            {getCopy(copy.privacyGate.fullPolicy, locale)}
          </Link>
          <button
            className="border-2 border-[var(--ff-border-default)] px-6 py-4 font-[var(--ff-font-ui)] text-sm font-bold uppercase tracking-[0.2em] text-[var(--ff-text-primary)] transition-colors hover:bg-[var(--ff-text-primary)] hover:text-[var(--ff-surface-base)]"
            onClick={onStayBlocked}
            type="button"
          >
            {getCopy(copy.privacyGate.lightDecline, locale)}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PrivacyGate({ children }: PropsWithChildren) {
  const { pathname } = useLocation()
  const { locale } = useLocale()
  const { theme } = useTheme()
  const [accepted, setAccepted] = useState(readPrivacyAccepted)
  const shouldBypassGate = pathname === PRIVACY_PAGE_HREF

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const previousOverflow = document.body.style.overflow

    if (!accepted && !shouldBypassGate) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [accepted, shouldBypassGate])

  const acceptPrivacy = () => {
    window.localStorage.setItem(PRIVACY_ACCEPTED_STORAGE_KEY, 'true')
    setAccepted(true)
  }

  const stayBlocked = () => {
    window.localStorage.removeItem(PRIVACY_ACCEPTED_STORAGE_KEY)
    setAccepted(false)
  }

  return (
    <>
      {children}
      {accepted || shouldBypassGate ? null : theme === 'dark' ? (
        <DarkPrivacyOverlay locale={locale} onAccept={acceptPrivacy} onStayBlocked={stayBlocked} />
      ) : (
        <LightPrivacyOverlay locale={locale} onAccept={acceptPrivacy} onStayBlocked={stayBlocked} />
      )}
    </>
  )
}
