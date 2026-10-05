/**
 * [INPUT]: PDF.js、同源 worker/字体资源与用户选择的 PDF File。
 * [OUTPUT]: renderPdfReportImages 返回按页码排序的 JPEG base64 数组。
 * [POS]: src/lib 的浏览器 PDF 转图边界；逐页释放画布，限制整份报告的图像载荷，不持久化文档。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部，并核对所属 AGENTS.md。
 */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl
const MAX_BASE64_LENGTH = Math.ceil((8 * 1024 * 1024 * 4) / 3)

export async function renderPdfReportImages(file: File) {
  const assetUrl = `${import.meta.env.BASE_URL}assets/pdfjs/`
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${assetUrl}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetUrl}standard_fonts/`,
    useWasm: false,
    wasmUrl: `${assetUrl}wasm/`,
    disableFontFace: true,
  })
  const pages: Array<{ dataBase64: string; mimeType: string }> = []
  let totalLength = 0
  try {
    const pdf = await task.promise
    if (pdf.numPages > 600) throw new Error('Too many PDF pages.')
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const natural = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.min(2, 2000 / Math.max(natural.width, natural.height)) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      try {
        await page.render({ canvas, viewport }).promise
        const dataBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
        if (!dataBase64) throw new Error('PDF page could not be rendered.')
        totalLength += dataBase64.length
        if (totalLength > MAX_BASE64_LENGTH) throw new Error('Rendered PDF exceeds the upload limit.')
        pages.push({ dataBase64, mimeType: 'image/jpeg' })
      } finally {
        canvas.width = canvas.height = 0
        page.cleanup()
      }
    }
    return pages
  } finally {
    await task.destroy()
  }
}
