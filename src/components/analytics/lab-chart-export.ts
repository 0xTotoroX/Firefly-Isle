/**
 * [INPUT]: 趋势 SVG、指标名称和当前主题 CSS 变量。
 * [OUTPUT]: exportLabChart 下载独立可读 SVG，保留坐标轴与连续上涨状态色。
 * [POS]: components/analytics 的图表导出边界，不读取患者资料或调用网络。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
export function exportLabChart(svg: SVGSVGElement | null | undefined, itemName?: string) {
  if (!svg || typeof document === 'undefined') {
    return
  }

  const clonedSvg = svg.cloneNode(true) as SVGSVGElement
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const rootStyles = getComputedStyle(document.documentElement)
  const exportedVariables = [
    '--ff-accent-primary',
    '--ff-accent-success',
    '--ff-critical',
    '--ff-border-default',
    '--ff-surface-inset',
    '--ff-text-muted',
    '--ff-text-primary',
    '--ff-text-secondary',
  ]
    .map((name) => `${name}:${rootStyles.getPropertyValue(name).trim()};`)
    .join('')
  const style = document.createElementNS(svgNamespace, 'style')
  const background = document.createElementNS(svgNamespace, 'rect')

  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clonedSvg.querySelectorAll('[data-export-axis-label]').forEach((label) => label.removeAttribute('display'))
  style.textContent = `:root{${exportedVariables}}text{font-family:${rootStyles.getPropertyValue('--ff-font-ui')}}`
  background.setAttribute('width', '100%')
  background.setAttribute('height', '100%')
  background.setAttribute('fill', 'var(--ff-surface-inset)')
  clonedSvg.insertBefore(background, clonedSvg.firstChild)
  clonedSvg.insertBefore(style, clonedSvg.firstChild)

  const source = new XMLSerializer().serializeToString(clonedSvg)
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const filename = itemName?.replace(/[\\/:*?"<>|\s]+/g, '-') || '指标趋势'

  link.href = url
  link.download = `${filename}-趋势图.svg`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
