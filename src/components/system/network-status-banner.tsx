/**
 * [INPUT]: 依赖 @/lib/network-status 的在线状态 hook 与 locale。
 * [OUTPUT]: 对外提供 NetworkStatusBanner。
 * [POS]: src/components/system 的 PWA 网络状态提示条，固定在安全区内，只在离线时提示需要重新连接。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useLocale } from '@/lib/locale'
import { getOnlineRequiredMessage, useBrowserOnlineStatus } from '@/lib/network-status'

export function NetworkStatusBanner() {
  const { locale } = useLocale()
  const isOnline = useBrowserOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div
      className="fixed z-[140] rounded-[var(--ff-radius-md)] border border-[var(--ff-accent-primary)] bg-[var(--ff-surface-warning)] px-4 py-3 text-sm font-bold leading-6 text-[var(--ff-text-primary)] shadow-[0_18px_42px_rgba(0,0,0,0.3)]"
      data-testid="network-status-banner"
      role="status"
      style={{
        bottom: 'calc(var(--ff-safe-bottom) + 1rem)',
        left: 'max(var(--ff-safe-left), 1rem)',
        right: 'max(var(--ff-safe-right), 1rem)',
      }}
    >
      {getOnlineRequiredMessage(locale)}
    </div>
  )
}
