/**
 * [INPUT]: 依赖 vitest 断言，依赖 ./lab-dictionary 的实验室指标字典、参考范围解析与 OCR 候选归一化。
 * [OUTPUT]: 对外提供血常规、血生化、肿瘤标志物字典映射和参考范围解析回归测试。
 * [POS]: lib/labs 的实验室字典测试，约束本地 update-followup-data 行映射被稳定翻译为网页端 itemCode 事实。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import { findLabIndicator, getLabIndicatorsByCategory, normalizeLabCandidate, parseReferenceRange } from './lab-dictionary'

describe('lab dictionary', () => {
  it('maps blood routine, blood biochemistry and tumor marker aliases to stable item codes', () => {
    expect(findLabIndicator('blood-routine', '白细胞计数')?.code).toBe('wbc')
    expect(findLabIndicator('blood-biochemistry', '丙氨酸氨基转移酶')?.code).toBe('alt')
    expect(findLabIndicator('tumor-marker', 'CA15-3')?.code).toBe('ca15_3')
    expect(getLabIndicatorsByCategory('tumor-marker').map((item) => item.code)).toContain('ca72_4')
  })

  it('parses common reference range notations', () => {
    expect(parseReferenceRange('3.5-9.5')).toEqual({ high: 9.5, low: 3.5 })
    expect(parseReferenceRange('参考值 ≤ 5')).toEqual({ high: 5 })
    expect(parseReferenceRange('>90')).toEqual({ low: 90 })
  })

  it('normalizes OCR candidates into dictionary-backed readings', () => {
    expect(
      normalizeLabCandidate(
        {
          itemName: '癌胚抗原',
          referenceRange: '<5',
          testDate: '2026-05-10',
          unit: 'ng/mL',
          value: '12.4 ↑',
        },
        'tumor-marker',
      ),
    ).toMatchObject({
      reading: {
        itemCode: 'cea',
        referenceHigh: 5,
        testDate: '2026-05-10',
        value: 12.4,
      },
      status: 'mapped',
    })
  })

  it('keeps unmapped or value-less rows in review instead of inventing readings', () => {
    const unmapped = normalizeLabCandidate({ itemName: '未知指标', value: 1 }, 'blood-routine')
    const invalid = normalizeLabCandidate({ itemName: '白细胞', value: '未见数值' }, 'blood-routine')

    expect(unmapped).toMatchObject({ status: 'unmapped' })
    expect(unmapped).not.toHaveProperty('reading')
    expect(invalid).toMatchObject({ status: 'invalid-value' })
    expect(invalid).not.toHaveProperty('reading')
  })
})
