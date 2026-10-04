/**
 * [INPUT]: 依赖 vitest 断言，依赖 ./lab-report-ingestion 的 OCR 文本复核行构建、确认读数输出和阻塞复核判断。
 * [OUTPUT]: 对外提供网页端实验室报告摄入纯逻辑回归测试，覆盖 OCR candidate 复核、保存前修正、未解析行与 CBC 派生 payload。
 * [POS]: lib/labs 的实验室报告摄入测试，确保网页端上传路径不依赖本地 Excel 且保存前必须形成可复核结构。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import { buildLabReportDate, extractLabReportReviewRows, getLabReviewIssues, hasBlockingReviewRows, toConfirmedLabReadings, type LabReviewRow } from './lab-report-ingestion'

describe('lab report ingestion', () => {
  it('extracts dated OCR rows into editable review rows', () => {
    const rows = extractLabReportReviewRows(
      [
        '检验日期：2026年5月10日',
        '白细胞 2.8 10^9/L 参考范围 3.5-9.5',
        '中性粒细胞绝对值 1.8',
        '淋巴细胞绝对值 0.9',
        '血小板 180',
      ].join('\n'),
      'blood-routine',
    )

    expect(buildLabReportDate('报告日期 2026/5/10')).toBe('2026-05-10')
    expect(rows[0]).toMatchObject({
      itemCode: 'wbc',
      referenceHigh: '9.5',
      referenceLow: '3.5',
      status: 'mapped',
      testDate: '2026-05-10',
      value: '2.8',
    })
  })

  it('turns confirmed review rows into direct and derived lab readings', () => {
    const rows = extractLabReportReviewRows(
      ['2026-05-10', '中性粒细胞绝对值 1.8', '淋巴细胞绝对值 0.9', '单核细胞绝对值 0.27', '血小板 180'].join('\n'),
      'blood-routine',
    )

    expect(toConfirmedLabReadings(rows, 'blood-routine')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'neutrophil_abs', source: 'ocr' }),
        expect.objectContaining({ itemCode: 'nlr', isDerived: true, source: 'derived', value: 2 }),
        expect.objectContaining({ itemCode: 'plr', isDerived: true, value: 200 }),
        expect.objectContaining({ itemCode: 'mlr', isDerived: true, value: 0.3 }),
      ]),
    )
  })

  it('blocks unresolved included rows but allows excluded rows', () => {
    const row: LabReviewRow = {
      id: 'row-1',
      include: true,
      itemCode: '',
      itemName: '未知',
      message: '需要复核',
      rawText: '未知指标 1',
      referenceHigh: '',
      referenceLow: '',
      status: 'needs-review',
      testDate: '2026-05-10',
      unit: '',
      value: '1',
    }

    expect(hasBlockingReviewRows([row])).toBe(true)
    expect(hasBlockingReviewRows([{ ...row, include: false }])).toBe(false)
  })

  it('keeps unknown OCR candidates until the user maps or excludes them', () => {
    const rows = extractLabReportReviewRows('报告日期：2026-10-02\n未知检验 5.5\n白细胞 4.2', 'blood-routine')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ rawText: '未知检验 5.5', itemCode: '', status: 'needs-review', include: true })
    expect(hasBlockingReviewRows(rows, 'blood-routine')).toBe(true)
    expect(() => toConfirmedLabReadings(rows, 'blood-routine')).toThrow()
    expect(toConfirmedLabReadings([{ ...rows[0], include: false }, rows[1]], 'blood-routine')).toHaveLength(1)
    expect(toConfirmedLabReadings([{ ...rows[0], itemCode: 'wbc', value: '4.8' }], 'blood-routine')[0]).toMatchObject({ itemCode: 'wbc', value: 4.8 })
  })

  it.each(['2026-02-30', '2026-10', '2026-13-01', ''])('requires a real full test date: %s', (testDate) => {
    const [row] = extractLabReportReviewRows('2026-10-02\n白细胞 4.2', 'blood-routine')
    expect(getLabReviewIssues({ ...row, testDate }, 'blood-routine')).toContain('date')
  })

  it.each(['', 'NaN', 'Infinity', '0x12', '12mg'])('rejects invalid numeric values: %s', (value) => {
    const [row] = extractLabReportReviewRows('2026-10-02\n白细胞 4.2', 'blood-routine')
    expect(getLabReviewIssues({ ...row, value }, 'blood-routine')).toContain('value')
  })

  it('rejects invalid or reversed ranges and saves the corrected values exactly', () => {
    const [row] = extractLabReportReviewRows('2026-10-02\n白细胞 4.2', 'blood-routine')
    expect(getLabReviewIssues({ ...row, referenceLow: '9', referenceHigh: '2' })).toContain('reference')
    expect(getLabReviewIssues({ ...row, referenceHigh: 'unknown' })).toContain('reference')
    const [reading] = toConfirmedLabReadings([{ ...row, value: '5.1', unit: 'custom', referenceLow: '', referenceHigh: '8.2' }], 'blood-routine')
    expect(reading).toMatchObject({ value: 5.1, unit: 'custom', referenceHigh: 8.2 })
    expect(reading.referenceLow).toBeUndefined()
  })
})
