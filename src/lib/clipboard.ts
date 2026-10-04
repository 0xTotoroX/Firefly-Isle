/**
 * [INPUT]: 依赖 DOM 的 textarea 回退路径与 navigator.clipboard 异步 API。
 * [OUTPUT]: 对外提供 writeClipboardText。
 * [POS]: lib 的剪贴板边界，旧 execCommand 路径优先、异步 API 兜底，供顶栏联系邮箱与复诊摘要复制共用。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export async function writeClipboardText(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.inset = '0 auto auto 0'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.focus({ preventScroll: true })
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  try {
    if (document.execCommand('copy')) {
      return true
    }
  } catch {
    // 继续走异步剪贴板路径，避免旧 API 被禁用时直接失败。
  } finally {
    textarea.remove()
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  return false
}
