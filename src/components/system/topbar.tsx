/**
 * [INPUT]: 依赖 react 的单一顶栏弹层状态、hover 延迟关闭与复制反馈计时器，依赖 @/components/background-music-toggle 的共享背景音乐开关，依赖 @/components/system/origin-story/origin-story-paper 的创作初衷纸页，依赖 @/components/system/surfaces 的 TopBarShell，依赖 @/lib/theme/tokens 的可变侧栏边缘钉住、标题截断与高度合同。
 * [OUTPUT]: 对外提供 ClinicalTopBar 组件，并在邮件联系弹窗内提供公开联系邮箱点击复制。
 * [POS]: src/components/system 的共享顶部工具条，统一 dark/light 页面名、背景音乐直接开关、创作初衷入口、邮件 hover 联系弹窗与邮箱复制反馈，并通过单一 overlay 状态避免弹层互相叠加。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useEffect, useRef, useState } from 'react'

import { writeClipboardText } from '@/lib/clipboard'
import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'

import { BackgroundMusicToggle } from '@/components/background-music-toggle'
import { OriginStoryPaper } from '@/components/system/origin-story/origin-story-paper'
import { TopBarShell } from '@/components/system/surfaces'
import { shellViewportOffsetClass, topBarHeightClass } from '@/lib/theme/tokens'
import { cn } from '@/lib/utils'

type ClinicalTopBarProps = {
  theme: 'dark' | 'light'
  title?: string
  withRail?: boolean
}

type TopbarOverlay = 'contact' | 'origin-story' | null
type ContactCopyStatus = 'idle' | 'copied'

const CONTACT_EMAIL = 'ghibli1024@gmail.com'
const contactStatusId = 'topbar-contact-copy-status'
const contactPanelId = 'topbar-contact-card'

export function ClinicalTopBar({ theme, title, withRail = false }: ClinicalTopBarProps) {
  const { locale } = useLocale()
  const [openOverlay, setOpenOverlay] = useState<TopbarOverlay>(null)
  const [contactCopyStatus, setContactCopyStatus] = useState<ContactCopyStatus>('idle')
  const contactCloseTimerRef = useRef<number | null>(null)
  const originStoryButtonRef = useRef<HTMLButtonElement>(null)
  const resolvedTitle = title ?? getCopy(copy.shell.brand.darkSubtitle, locale)
  const railOffset = withRail ? shellViewportOffsetClass : 'left-0 w-full'
  const contactLabel = getCopy(copy.shell.topbar.contact.label, locale)
  const contactTitle = getCopy(copy.shell.topbar.contact.title, locale)
  const contactCopyLabel = getCopy(copy.shell.topbar.contact.copyEmail, locale)
  const contactCopyMessage = getCopy(copy.shell.topbar.contact.copied, locale)
  const contactOpen = openOverlay === 'contact'
  const contactCopyVisible = contactCopyStatus !== 'idle'
  const originStoryOpen = openOverlay === 'origin-story'

  useEffect(() => {
    if (contactCopyStatus === 'idle') {
      return
    }

    const timeoutId = window.setTimeout(() => setContactCopyStatus('idle'), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [contactCopyStatus])

  useEffect(() => () => {
    if (contactCloseTimerRef.current !== null) {
      window.clearTimeout(contactCloseTimerRef.current)
    }
  }, [])

  const openContact = () => {
    if (contactCloseTimerRef.current !== null) {
      window.clearTimeout(contactCloseTimerRef.current)
      contactCloseTimerRef.current = null
    }

    setOpenOverlay('contact')
  }

  const scheduleContactClose = () => {
    if (contactCloseTimerRef.current !== null) {
      window.clearTimeout(contactCloseTimerRef.current)
    }

    contactCloseTimerRef.current = window.setTimeout(() => {
      setOpenOverlay((current) => (current === 'contact' ? null : current))
      contactCloseTimerRef.current = null
    }, 800)
  }

  const handleContactEmailClick = async () => {
    openContact()
    setContactCopyStatus('copied')
    await writeClipboardText(CONTACT_EMAIL)
  }

  return (
    <TopBarShell
      className={cn(
        'fixed top-0 z-40 flex min-w-0 items-center justify-start gap-2 px-3 sm:justify-between sm:gap-0 sm:px-5 md:px-8',
        topBarHeightClass,
        railOffset,
      )}
      theme={theme}
    >
      <div className="flex min-w-0 items-center gap-2 pr-1 sm:flex-1 sm:gap-4 sm:pr-3">
        <div className="h-7 w-[2px] shrink-0 bg-[var(--ff-accent-primary)]" />
        <div className="min-w-0">
          <div className="truncate whitespace-nowrap font-[var(--ff-font-display)] text-base font-black leading-tight tracking-normal text-[var(--ff-text-primary)] max-[360px]:sr-only sm:text-lg md:text-2xl">
            {resolvedTitle}
          </div>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-1 sm:gap-3">
        <BackgroundMusicToggle
          className="t-control-press h-10 w-10 rounded-[var(--ff-radius-sm)] border border-transparent bg-transparent text-[var(--ff-text-primary)] hover:bg-[var(--ff-surface-panel)] hover:text-[var(--ff-accent-text)] sm:h-11 sm:w-11"
          layout="compact"
        />
        <button
          aria-controls="origin-story-paper"
          aria-expanded={originStoryOpen}
          aria-label={locale === 'zh' ? '为什么做一页萤屿' : 'Why Firefly Isle'}
          className="t-control-press flex h-10 w-10 items-center justify-center rounded-[var(--ff-radius-sm)] border border-transparent bg-transparent text-[var(--ff-text-primary)] transition-colors hover:bg-[var(--ff-surface-panel)] hover:text-[var(--ff-accent-text)] sm:h-11 sm:w-11"
          data-topbar-action="origin-story"
          onClick={() => setOpenOverlay((current) => (current === 'origin-story' ? null : 'origin-story'))}
          ref={originStoryButtonRef}
          title={locale === 'zh' ? '为什么做一页萤屿' : 'Why Firefly Isle'}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
            eco
          </span>
        </button>
        <div className="relative inline-flex shrink-0">
          <button
            aria-controls={contactPanelId}
            aria-expanded={contactOpen}
            aria-label={contactLabel}
            className="t-control-press flex h-10 w-10 items-center justify-center rounded-[var(--ff-radius-sm)] border border-transparent bg-transparent text-[var(--ff-text-primary)] transition-colors hover:bg-[var(--ff-surface-panel)] hover:text-[var(--ff-accent-text)] sm:h-11 sm:w-11"
            data-topbar-action="contact"
            onClick={openContact}
            onFocus={openContact}
            onPointerEnter={openContact}
            onPointerLeave={scheduleContactClose}
            title={contactTitle}
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">
            mail
            </span>
          </button>
          {contactOpen ? (
            <>
              <div
                aria-hidden="true"
                className="fixed right-4 top-[56px] z-50 h-6 w-[min(22rem,calc(100vw-2rem))]"
                data-testid="topbar-contact-hover-bridge"
                onPointerEnter={openContact}
                onPointerLeave={scheduleContactClose}
              />
              <div
                aria-label={contactTitle}
                className="t-popover fixed right-4 top-[calc(var(--ff-topbar-height)+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-4 text-sm font-semibold leading-6 text-[var(--ff-text-primary)] shadow-[0_18px_42px_rgba(0,0,0,0.28)]"
                data-testid="topbar-contact-card"
                id={contactPanelId}
                onPointerEnter={openContact}
                onPointerLeave={scheduleContactClose}
                role="dialog"
              >
                小生才疏学浅，有任何问题都可以通过{' '}
                <button
                  aria-describedby={contactCopyVisible ? contactStatusId : undefined}
                  aria-label={contactCopyLabel}
                  className="t-control-press inline-flex rounded-[var(--ff-radius-sm)] px-1 font-black text-[var(--ff-accent-text)] transition-colors hover:bg-[var(--ff-surface-inset)]"
                  data-contact-email={CONTACT_EMAIL}
                  onClick={() => void handleContactEmailClick()}
                  title={contactCopyLabel}
                  type="button"
                >
                  {CONTACT_EMAIL}
                </button>
                {' '}联系我
                {contactCopyVisible ? (
                  <span
                    aria-live="polite"
                    className="ml-2 inline-flex rounded-[var(--ff-radius-sm)] bg-[var(--ff-surface-inset)] px-2 py-0.5 text-xs font-black text-[var(--ff-accent-text)]"
                    data-testid="topbar-contact-copy-status"
                    id={contactStatusId}
                    role="status"
                  >
                    {contactCopyMessage}
                  </span>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
      <OriginStoryPaper anchorRef={originStoryButtonRef} onClose={() => setOpenOverlay(null)} open={originStoryOpen} theme={theme} />
    </TopBarShell>
  )
}
