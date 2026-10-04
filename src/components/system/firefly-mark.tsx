/**
 * [INPUT]: 依赖 @/lib/utils 的 cn 工具，读取 public/logo-island-lighthouse 的透明品牌资产。
 * [OUTPUT]: 对外提供 FireflyMark 组件，渲染一页萤屿“岛屿微光灯塔”品牌 mark。
 * [POS]: components/system 的品牌符号基元，被登录页、展开侧栏与 compact 侧栏复用，确保全站 mark 与 favicon 同源且不再与标题绑定。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { cn } from '@/lib/utils'

type FireflyMarkProps = {
  className?: string
  size?: 'large' | 'rail'
}

export function FireflyMark({ className, size = 'large' }: FireflyMarkProps) {
  const compact = size === 'rail'

  return (
    <div className={cn('relative grid shrink-0 place-items-center', compact ? 'h-[54px] w-[54px]' : 'h-24 w-24', className)}>
      <picture aria-hidden="true" className="block h-full w-full">
        <source srcSet="/logo-island-lighthouse.webp" type="image/webp" />
        <img alt="" className="h-full w-full object-contain drop-shadow-[0_0_3px_rgba(248,106,0,0.24)]" draggable={false} src="/logo-island-lighthouse.png" />
      </picture>
    </div>
  )
}
