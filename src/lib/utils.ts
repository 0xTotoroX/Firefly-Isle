/**
 * [INPUT]: 依赖 clsx 的条件类名拼接与 tailwind-merge 的冲突合并。
 * [OUTPUT]: 对外提供 cn 类名合并函数。
 * [POS]: lib 的通用无状态工具，被 UI 基元与页面骨架共用。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
