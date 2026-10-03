/** @vitest-environment happy-dom */
/**
 * [INPUT]: 依赖 Vitest 的模块 mock、真实 DOM 与 ./export-record 的 PDF/PNG 导出入口。
 * [OUTPUT]: 验证导出副本隔离、安全边距、现代颜色、正文避让分页、纯空白尾页省略与压缩下载。
 * [POS]: lib 的导出边界行为测试；页面原 DOM 不变，PDF 每页只嵌入对应图像切片。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { exportElementAsPdf, exportElementAsPng } from './export-record'

const addImage = vi.fn()
const addPage = vi.fn()
const save = vi.fn()
const toBlob = vi.fn((resolve: (blob: Blob | null) => void) => resolve(new Blob(['png'], { type: 'image/png' })))
const getImageData = vi.fn()
const canvas = { height: 6000, width: 1920, toBlob, getContext: () => ({ getImageData }) } as unknown as HTMLCanvasElement
const drawImage = vi.fn()
const fillRect = vi.fn()

function paintLastPixelAt(row: number, pixel = [0, 0, 0, 255]) {
  getImageData.mockImplementation((_x: number, top: number, width: number, height: number) => {
    const data = new Uint8ClampedArray(width * height * 4).fill(255)
    if (row >= top && row < top + height) data.set(pixel, (row - top) * width * 4)
    return { data }
  })
}

vi.mock('html2canvas-pro', () => ({ default: vi.fn() }))
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function jsPDFMock() {
    return { addImage, addPage, save, internal: { pageSize: { getHeight: () => 297, getWidth: () => 210 } } }
  }),
}))

function createClone() {
  const doc = document.implementation.createHTMLDocument()
  doc.documentElement.className = 'dark'
  doc.documentElement.dataset.accent = '#C48A4A'
  doc.body.innerHTML = '<main style="margin-left: 204px; width: 1012px"><div id="record"><header><div style="display:flex"><div>临床病史档案</div></div></header><p>测试正文</p></div></main>'
  const root = doc.getElementById('record')!
  return { doc, root }
}

describe('export-record helpers', () => {
  let element: HTMLElement
  let click: ReturnType<typeof vi.spyOn>
  let toDataURL: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    canvas.height = 6000
    paintLastPixelAt(canvas.height - 1)
    document.body.innerHTML = '<main><div id="original">病历</div></main>'
    element = document.getElementById('original')!
    vi.mocked(html2canvas).mockResolvedValue(canvas)
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:record')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, fillRect, fillStyle: '' } as unknown as CanvasRenderingContext2D)
    toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement) { return `data:image/jpeg;base64,page-height-${this.height}` })
  })

  afterEach(() => vi.restoreAllMocks())

  it('exports PNG with a fixed viewport independent of the current scroll or window', async () => {
    await exportElementAsPng(element)
    expect(html2canvas).toHaveBeenCalledWith(element, {
      backgroundColor: '#ffffff', onclone: expect.any(Function), scale: 2,
      scrollX: 0, scrollY: 0, useCORS: true, windowWidth: 960,
    })
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
    expect(click).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:record')
  })

  it('isolates only the clone from the sidebar and gives it margins without stripping modern colors', async () => {
    await exportElementAsPng(element)
    const { doc, root } = createClone()
    const child = root.querySelector('p')!
    child.style.color = 'oklch(70% 0.1 40)'
    child.style.backgroundImage = 'linear-gradient(oklab(0.5 0.1 0.1), white)'
    const color = child.style.color
    const background = child.style.backgroundImage
    await vi.mocked(html2canvas).mock.calls[0][1]?.onclone?.(doc, root)
    expect(root.parentElement).toBe(doc.body)
    expect(doc.querySelector('main')).toBeNull()
    expect(doc.documentElement.classList.contains('dark')).toBe(false)
    expect(doc.documentElement.style.getPropertyValue('--ff-critical')).toBe('#B42318')
    expect(doc.head.querySelector('style')).toBeNull()
    expect(root.dataset.fireflyExportSnapshot).toBe('true')
    expect(root.style.width).toBe('960px')
    expect(root.style.padding).toBe('40px')
    expect(root.style.margin).toBe('0px')
    expect(child.style.color).toBe(color)
    expect(child.style.backgroundImage).toBe(background)
    expect(child.style.animation).toBe('none')
    expect(element.parentElement?.tagName).toBe('MAIN')
    expect(element.style.cssText).toBe('')
  })

  it('compresses page slices and moves a treatment block intact to the next page', async () => {
    const { doc, root } = createClone()
    const treatment = doc.createElement('article')
    treatment.dataset.exportBlock = ''
    treatment.textContent = '不应在治疗文字中间切页'
    vi.spyOn(treatment, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 1300, 800, 220))
    root.appendChild(treatment)
    vi.mocked(html2canvas).mockImplementation(async (_element, options) => {
      await options?.onclone?.(doc, root)
      return canvas
    })

    await exportElementAsPdf(element)

    expect(jsPDF).toHaveBeenCalledWith({ compress: true, format: 'a4', orientation: 'portrait', unit: 'mm' })
    expect(drawImage.mock.calls[0]).toEqual([canvas, 0, 0, 1920, 2600, 0, 0, 1920, 2600])
    expect(drawImage.mock.calls[1][2]).toBe(2600)
    const slices = drawImage.mock.calls.map((call) => ({ start: call[2] as number, height: call[4] as number }))
    expect(slices.reduce((sum, slice) => sum + slice.height, 0)).toBe(canvas.height)
    expect(slices.every((slice) => slice.start + slice.height <= 2600 || slice.start + slice.height >= 3040)).toBe(true)
    expect(addPage).toHaveBeenCalledTimes(2)
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.94)
    expect(addImage.mock.calls.every((call) => call[1] === 'JPEG' && call[2] === 10 && call[3] === 10 && call[4] === 190 && call[7] === 'FAST')).toBe(true)
    expect(save).toHaveBeenCalledWith(expect.stringMatching(/^firefly-\d{4}-\d{2}-\d{2}\.pdf$/))
  })

  it('splits an oversized paragraph between measured lines and always advances', async () => {
    const { doc, root } = createClone()
    const paragraph = root.querySelector('p')!
    vi.spyOn(paragraph, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 800, 4000))
    const range = doc.createRange()
    vi.spyOn(range, 'getClientRects').mockReturnValue([new DOMRect(0, 1390, 800, 24)] as unknown as DOMRectList)
    vi.spyOn(doc, 'createRange').mockReturnValue(range)
    vi.mocked(html2canvas).mockImplementation(async (_element, options) => {
      await options?.onclone?.(doc, root)
      return canvas
    })
    await exportElementAsPdf(element)
    expect(drawImage.mock.calls[0][4]).toBe(2776)
    expect(drawImage.mock.calls.every((call) => (call[4] as number) > 0)).toBe(true)
    expect(drawImage.mock.calls.reduce((sum, call) => sum + (call[4] as number), 0)).toBe(6000)
  })

  it('uses the shared edge between adjacent treatment blocks without binding the whole timeline', async () => {
    const { doc, root } = createClone()
    for (let index = 0; index < 10; index += 1) {
      const treatment = doc.createElement('article')
      treatment.dataset.exportBlock = ''
      vi.spyOn(treatment, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, index * 300, 800, 300))
      root.appendChild(treatment)
    }
    vi.mocked(html2canvas).mockImplementation(async (_element, options) => {
      await options?.onclone?.(doc, root)
      return canvas
    })
    await exportElementAsPdf(element)
    expect(drawImage.mock.calls.map((call) => [call[2], call[4]])).toEqual([[0, 2400], [2400, 2400], [4800, 1200]])
  })

  it('keeps a section heading with the first content line when its first block moves', async () => {
    const { doc, root } = createClone()
    const heading = doc.createElement('h2')
    heading.textContent = '治疗时间线'
    const treatment = doc.createElement('article')
    treatment.dataset.exportBlock = ''
    treatment.textContent = '第一阶段治疗'
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 1300, 800, 40))
    vi.spyOn(treatment, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 1350, 800, 200))
    root.append(heading, treatment)
    vi.spyOn(doc, 'createRange').mockImplementation(() => {
      let selected: Node | undefined
      return {
        selectNodeContents: (node: Node) => { selected = node },
        getClientRects: () => selected === treatment.firstChild ? [new DOMRect(0, 1365, 500, 24)] : [],
      } as unknown as Range
    })
    vi.mocked(html2canvas).mockImplementation(async (_element, options) => {
      await options?.onclone?.(doc, root)
      return canvas
    })
    await exportElementAsPdf(element)
    expect(drawImage.mock.calls[0][4]).toBe(2600)
    expect(drawImage.mock.calls[1][2]).toBe(2600)
  })

  it('omits a white trailing page while preserving the first two slices and their margins', async () => {
    const { doc, root } = createClone()
    const treatment = doc.createElement('article')
    treatment.dataset.exportBlock = ''
    vi.spyOn(treatment, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 1383, 800, 200))
    root.appendChild(treatment)
    canvas.height = 5638
    paintLastPixelAt(5549)
    vi.mocked(html2canvas).mockImplementation(async (_element, options) => {
      await options?.onclone?.(doc, root)
      return canvas
    })

    await exportElementAsPdf(element)

    expect(drawImage.mock.calls.map((call) => [call[2], call[4]])).toEqual([[0, 2766], [2766, 2799]])
    expect(addPage).toHaveBeenCalledTimes(1)
    expect(addImage.mock.calls.every((call) => call[2] === 10 && call[3] === 10 && call[4] === 190)).toBe(true)
  })

  it.each([
    ['faint gray', [254, 254, 254, 255]],
    ['color', [255, 255, 0, 255]],
    ['low alpha', [0, 0, 0, 1]],
  ])('retains a final page with one %s pixel after a white gap', async (_label, pixel) => {
    paintLastPixelAt(5700, pixel as number[])

    await exportElementAsPdf(element)

    expect(drawImage.mock.calls.map((call) => [call[2], call[4]])).toEqual([[0, 2799], [2799, 2799], [5598, 402]])
    expect(addPage).toHaveBeenCalledTimes(2)
  })

  it('retains all pages when the browser cannot read canvas pixels', async () => {
    getImageData.mockImplementation(() => { throw new DOMException('Cannot read canvas', 'SecurityError') })

    await exportElementAsPdf(element)

    expect(drawImage.mock.calls.reduce((sum, call) => sum + (call[4] as number), 0)).toBe(canvas.height)
    expect(addPage).toHaveBeenCalledTimes(2)
  })
})
