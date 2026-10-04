// @vitest-environment happy-dom
/**
 * [INPUT]: 合成 SVG 和本地主题变量。
 * [OUTPUT]: 验证独立 SVG 下载保留连续上涨状态色和坐标轴，并保持原图不变。
 * [POS]: components/analytics 的图表导出回归。
 * [PROTOCOL]: 导出合同变化时同步本测试及模块地图。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportLabChart } from './lab-chart-export'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.style.removeProperty('--ff-critical')
})

describe('exportLabChart', () => {
  it('embeds the continuous-rise color and restores the standalone axis labels', async () => {
    document.documentElement.style.setProperty('--ff-critical', '#a12828')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.innerHTML = '<polyline stroke="var(--ff-critical)" points="0,20 10,10 20,0"/><text data-export-axis-label="true" display="none">20</text>'
    let exportedBlob: Blob | undefined
    let downloadName = ''
    const create = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      exportedBlob = blob as Blob
      return 'blob:synthetic-chart'
    })
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download
    })

    exportLabChart(svg, 'CA 15/3')
    expect(create).toHaveBeenCalledOnce()
    const exported = await exportedBlob!.text()
    expect(exported).toContain('--ff-critical:#a12828')
    expect(exported).toContain('stroke="var(--ff-critical)"')
    expect(exported).not.toContain('display="none"')
    expect(svg.querySelector('[data-export-axis-label]')?.getAttribute('display')).toBe('none')
    expect(downloadName).toBe('CA-15-3-趋势图.svg')
    expect(revoke).toHaveBeenCalledWith('blob:synthetic-chart')
  })
})
