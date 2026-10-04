/**
 * [INPUT]: 依赖 react 的弹层生命周期 hooks、AuthCard、auth-copy、登录认证卡 skin 与 motion.css 的 modal/popover 动效合同。
 * [OUTPUT]: 对外提供 AuthOverlay 组件，负责统一登录弹层、弹出/关闭动画、Esc 关闭与背景点击关闭。
 * [POS]: components/login 的弹层容器，只编排 AuthCard 与 modal/popover 动效，不承载表单字段实现。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { getAuthModeCopy } from './auth-copy'
import { AuthCard, type AuthCardProps } from './auth-card'
import { authCardSkins } from './skins'

type AuthOverlayProps = AuthCardProps & {
  onClose: () => void
}

export function AuthOverlay({ onClose, ...authCardProps }: AuthOverlayProps) {
  const { locale, theme } = authCardProps
  const skin = authCardSkins[theme]
  const overlayClass = theme === 'dark' ? 'bg-black/72' : 'bg-[#eff7f7]/78'
  const modeCopy = getAuthModeCopy(authCardProps.mode, locale, authCardProps.authMethod)
  const closeTimerRef = useRef<number | null>(null)
  const closingRef = useRef(false)
  const [motionState, setMotionState] = useState<'' | 'is-closing' | 'is-open'>(() =>
    typeof document === 'undefined' ? 'is-open' : '',
  )
  const requestClose = useCallback(() => {
    if (closingRef.current) {
      return
    }

    closingRef.current = true
    setMotionState('is-closing')
    closeTimerRef.current = window.setTimeout(onClose, 150)
  }, [onClose])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMotionState('is-open'))

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        requestClose()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [requestClose])

  return (
    <div
      aria-label={modeCopy.dialogLabel}
      aria-modal="true"
      className={`fixed inset-0 z-[80] overflow-y-auto px-4 py-5 backdrop-blur-sm ${overlayClass}`}
      data-testid="login-auth-overlay"
      onClick={requestClose}
      role="dialog"
    >
      <div
        className="mx-auto flex min-h-full w-full max-w-[520px] items-start py-2 sm:items-center"
        data-testid="login-auth-modal-card"
      >
        <div className={`relative w-full t-modal t-popover ${motionState}`} onClick={(event) => event.stopPropagation()}>
          <button
            aria-label={locale === 'zh' ? `关闭${modeCopy.dialogLabel}` : `Close ${modeCopy.dialogLabel.toLowerCase()}`}
            className={`absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-[var(--ff-radius-full)] border transition-colors ${skin.closeButton}`}
            data-testid="login-auth-close"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <AuthCard {...authCardProps} id="login-auth-card" />
        </div>
      </div>
    </div>
  )
}
