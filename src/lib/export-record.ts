/**
 * [INPUT]: 依赖 html2canvas-pro 捕获正式病历 DOM，依赖 jsPDF 生成 A4 portrait PDF，依赖浏览器 Blob / URL 下载能力。
 * [OUTPUT]: 对外提供 exportElementAsPdf 与 exportElementAsPng，生成有安全边距的白色文档，按正文块和文字行分页压缩 PDF，并省略纯空白尾页。
 * [POS]: lib 的跨页面导出边界；复用病历 DOM，在截图克隆中隔离应用布局、隐藏操作，保留现代颜色与完整正文。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import html2canvas from 'html2canvas-pro'
import { defaultAccentHex, deriveAccentStops } from '@/lib/accent'
import { jsPDF } from 'jspdf'

const EXPORT_BACKGROUND_COLOR = '#ffffff'
const EXPORT_WIDTH = 960
const EXPORT_SCALE = 2
const PDF_MARGIN = 10
type ProtectedRegion = { top: number; bottom: number }
function getExportFileBase() {
  const date = new Date().toISOString().slice(0, 10)
  return `firefly-${date}`
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function prepareRecordExportClone(cloneDocument: Document, cloneRoot: HTMLElement) {
  const root = cloneDocument.documentElement
  root.classList.remove('dark')
  root.dataset.theme = 'light'
  root.style.colorScheme = 'light'
  const accent = deriveAccentStops(root.dataset.accent ?? defaultAccentHex, 'light')
  const colors = {
    '--ff-accent-text': accent.text,
    '--ff-accent-soft': accent.soft,
    '--ff-surface-accent': accent.soft,
    '--ff-accent-warning': accent.warning,
    '--ff-accent-success': accent.success,
    '--ff-critical': accent.critical,
    '--ff-low': accent.low,
  }
  for (const [property, value] of Object.entries(colors)) root.style.setProperty(property, value)
  // The app shell owns scroll and responsive widths; the export owns a standalone document.
  cloneDocument.body.replaceChildren(cloneRoot)
  cloneDocument.body.style.cssText = `margin: 0; width: ${EXPORT_WIDTH}px; min-width: 0; background: white;`
  cloneRoot.style.cssText = `box-sizing: border-box; width: ${EXPORT_WIDTH}px; max-width: none; margin: 0; padding: 40px; background: white; color: var(--ff-text-primary);`
  cloneRoot.setAttribute('data-firefly-export-snapshot', 'true')
  for (const node of [cloneRoot, ...cloneRoot.querySelectorAll<HTMLElement>('*')]) {
    node.style.animation = 'none'
    node.style.transition = 'none'
  }
}

function getTextLineRects(cloneDocument: Document, element: Element): DOMRect[] {
  const rects: DOMRect[] = []
  const walker = cloneDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const range = cloneDocument.createRange()
  while (walker.nextNode()) {
    if (!walker.currentNode.textContent?.trim()) continue
    range.selectNodeContents(walker.currentNode)
    for (const rect of range.getClientRects()) if (rect.height > 0) rects.push(rect)
  }
  return rects
}

function collectProtectedRegions(cloneDocument: Document, cloneRoot: HTMLElement): ProtectedRegion[] {
  const offset = cloneRoot.getBoundingClientRect().top
  const regions: ProtectedRegion[] = []
  const add = (rect: DOMRect, padding = 0) => {
    if (rect.height > 0) regions.push({ top: Math.max(0, rect.top - offset - padding), bottom: rect.bottom - offset + padding })
  }
  // Adjacent blocks share a valid cut boundary; padding would accidentally join them all.
  for (const node of cloneRoot.querySelectorAll('[data-export-block], header, tr, p, li, h1, h2, h3, h4, h5')) add(node.getBoundingClientRect())
  for (const heading of cloneRoot.querySelectorAll('h1, h2, h3, h4, h5')) {
    const following = heading.nextElementSibling
    const firstLine = following ? getTextLineRects(cloneDocument, following)[0] : undefined
    if (!firstLine) continue
    const top = heading.getBoundingClientRect().top - offset
    regions.push({ top: Math.max(0, top), bottom: firstLine.bottom - offset + 2 })
  }
  // A paragraph may exceed one page. Its individual browser-measured lines remain indivisible.
  for (const rect of getTextLineRects(cloneDocument, cloneRoot)) add(rect, 2)
  return regions
}

async function renderRecordCanvas(element: HTMLElement) {
  let regions: ProtectedRegion[] = []
  const canvas = await html2canvas(element, {
    backgroundColor: EXPORT_BACKGROUND_COLOR,
    onclone: (cloneDocument, cloneRoot) => {
      prepareRecordExportClone(cloneDocument, cloneRoot)
      regions = collectProtectedRegions(cloneDocument, cloneRoot)
    },
    scale: EXPORT_SCALE,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    windowWidth: EXPORT_WIDTH,
  })
  return { canvas, regions }
}

export async function exportElementAsPng(element: HTMLElement) {
  const { canvas } = await renderRecordCanvas(element)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })

  if (!blob) {
    throw new Error('Failed to create PNG blob.')
  }

  downloadBlob(blob, `${getExportFileBase()}.png`)
}

function getCanvasContentBottom(canvas: HTMLCanvasElement): number {
  const context = canvas.getContext('2d')
  if (!context) return canvas.height
  try {
    // Read small strips from the bottom; even a faint visible pixel must keep its page.
    for (let bottom = canvas.height; bottom > 0;) {
      const top = Math.max(0, bottom - 64)
      const { data } = context.getImageData(0, top, canvas.width, bottom - top)
      for (let offset = data.length - 4; offset >= 0; offset -= 4) {
        if (data[offset + 3] > 0 && (data[offset] < 255 || data[offset + 1] < 255 || data[offset + 2] < 255)) {
          return top + Math.floor(offset / 4 / canvas.width) + 1
        }
      }
      bottom = top
    }
    return 0
  } catch {
    // If pixel reads are unavailable, keep the original canvas rather than risk losing content.
    return canvas.height
  }
}

export async function exportElementAsPdf(element: HTMLElement) {
  const { canvas, regions } = await renderRecordCanvas(element)
  const contentBottom = getCanvasContentBottom(canvas)
  const pdf = new jsPDF({ compress: true, format: 'a4', orientation: 'portrait', unit: 'mm' })
  const pageWidth = pdf.internal.pageSize.getWidth() - PDF_MARGIN * 2
  const pageHeight = pdf.internal.pageSize.getHeight() - PDF_MARGIN * 2
  const maxSliceHeight = Math.floor(canvas.width * pageHeight / pageWidth)
  const protectedPixels = regions.map(({ top, bottom }) => ({ top: Math.floor(top * EXPORT_SCALE), bottom: Math.ceil(bottom * EXPORT_SCALE) }))
  const pageCanvas = document.createElement('canvas')
  const context = pageCanvas.getContext('2d')
  if (!context) throw new Error('Failed to create PDF canvas.')
  pageCanvas.width = canvas.width

  // Keep existing slice boundaries and margins; only omit pages beyond the last painted pixel.
  for (let start = 0; start < contentBottom;) {
    let end = Math.min(start + maxSliceHeight, canvas.height)
    if (end < canvas.height) {
      let overlapping: ProtectedRegion | undefined
      while ((overlapping = protectedPixels.find((region) => region.top > start && region.top < end && region.bottom > end && region.bottom - region.top <= maxSliceHeight))) end = overlapping.top
    }
    pageCanvas.height = end - start
    context.fillStyle = EXPORT_BACKGROUND_COLOR
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    context.drawImage(canvas, 0, start, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height)
    if (start > 0) pdf.addPage()
    pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', PDF_MARGIN, PDF_MARGIN, pageWidth, pageCanvas.height * pageWidth / canvas.width, undefined, 'FAST')
    start = end
  }

  pdf.save(`${getExportFileBase()}.pdf`)
}
