/**
 * [INPUT]: 依赖 @/components/system/topbar 的 ClinicalTopBar。
 * [OUTPUT]: 对外提供 LightMasthead 兼容组件。
 * [POS]: src/components/system 的 light 顶部状态条兼容导出，保持旧调用点但不再提供独立版头骨架。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'

import { ClinicalTopBar } from '@/components/system/topbar'

export function LightMasthead() {
  const { locale } = useLocale()

  return <ClinicalTopBar theme="light" title={getCopy(copy.shell.brand.lightTitle, locale)} />
}
