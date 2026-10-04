/**
 * [INPUT]: 依赖 vitest 的 describe/it/expect，依赖 ./lab-results 的实验室指标趋势分类、派生指标、图表序列和监测汇总工具。
 * [OUTPUT]: 对外提供实验室指标正常值、单次异常、连续异常、缺日期、缺参考范围、CBC 派生、最近异常、图表序列与肿瘤标志物上涨检测回归测试。
 * [POS]: lib 的纯逻辑测试，约束 lab trends 的医学提示边界不产生诊断结论。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import {
  buildDerivedBloodRoutineReadings,
  buildLabChartSeries,
  buildLabTrendRows,
  detectTumorMarkerContinuousRise,
  summarizeLatestAbnormalByCategory,
} from './lab-results'

describe('buildLabTrendRows', () => {
  it('classifies normal values with centralized default reference ranges', () => {
    const rows = buildLabTrendRows([
      { category: 'blood-routine', itemCode: 'wbc', itemName: '白细胞', testDate: '2024-01-01', value: 6.2, unit: '10^9/L' },
      { category: 'blood-routine', itemCode: 'wbc', itemName: '白细胞', testDate: '2024-02-01', value: 7.1, unit: '10^9/L' },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      itemCode: 'wbc',
      latestDate: '2024-02-01',
      latestValue: 7.1,
      status: 'normal',
      trendWarning: null,
    })
  })

  it('marks a single high value without persistent elevation', () => {
    const rows = buildLabTrendRows([
      { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2024-01-01', value: 3.2, unit: 'ng/mL' },
      { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2024-02-01', value: 8.4, unit: 'ng/mL' },
    ])

    expect(rows[0]).toMatchObject({
      status: 'high',
      trendWarning: null,
    })
  })

  it('highlights consecutive high readings as persistent elevation without diagnosis text', () => {
    const rows = buildLabTrendRows([
      { category: 'tumor-marker', itemCode: 'ca125', itemName: 'CA125', testDate: '2024-01-01', value: 44, unit: 'U/mL' },
      { category: 'tumor-marker', itemCode: 'ca125', itemName: 'CA125', testDate: '2024-02-01', value: 62, unit: 'U/mL' },
    ])

    expect(rows[0].status).toBe('persistent-high')
    expect(rows[0].trendWarning).toContain('连续')
    expect(rows[0].trendWarning).not.toMatch(/诊断|治疗|用药/)
  })

  it('displays missing dates but ignores them for persistent elevation', () => {
    const rows = buildLabTrendRows([
      { category: 'blood-biochemistry', itemCode: 'alt', itemName: 'ALT', value: 92, unit: 'U/L' },
      { category: 'blood-biochemistry', itemCode: 'alt', itemName: 'ALT', testDate: '2024-02-01', value: 88, unit: 'U/L' },
    ])

    expect(rows[0]).toMatchObject({
      latestDate: '2024-02-01',
      readingCount: 2,
      status: 'high',
      undatedCount: 1,
    })
  })

  it('requires reference ranges when no row range or default exists', () => {
    const rows = buildLabTrendRows([
      { category: 'tumor-marker', itemCode: 'unknown-marker', itemName: '未知指标', testDate: '2024-01-01', value: 99, unit: 'U/mL' },
    ])

    expect(rows[0]).toMatchObject({
      referenceRangeLabel: '需补充参考范围',
      status: 'reference-missing',
      trendWarning: null,
    })
  })
})

describe('lab trend analytics helpers', () => {
  it('calculates CBC NLR, PLR and MLR derived readings with metadata', () => {
    expect(
      buildDerivedBloodRoutineReadings([
        { category: 'blood-routine', itemCode: 'neutrophil_abs', itemName: '中性粒细胞绝对值', testDate: '2026-05-10', value: 1.8 },
        { category: 'blood-routine', itemCode: 'lymphocyte_abs', itemName: '淋巴细胞绝对值', testDate: '2026-05-10', value: 0.9 },
        { category: 'blood-routine', itemCode: 'monocyte_abs', itemName: '单核细胞绝对值', testDate: '2026-05-10', value: 0.27 },
        { category: 'blood-routine', itemCode: 'platelet', itemName: '血小板', testDate: '2026-05-10', value: 180 },
      ]),
    ).toMatchObject([
      { derivationMethod: '中性粒细胞绝对值 / 淋巴细胞绝对值', isDerived: true, itemCode: 'nlr', source: 'derived', value: 2 },
      { itemCode: 'plr', value: 200 },
      { itemCode: 'mlr', value: 0.3 },
    ])
  })

  it('skips CBC derived readings when a denominator is missing or zero', () => {
    expect(
      buildDerivedBloodRoutineReadings([
        { category: 'blood-routine', itemCode: 'neutrophil_abs', itemName: '中性粒细胞绝对值', value: 1.8 },
        { category: 'blood-routine', itemCode: 'lymphocyte_abs', itemName: '淋巴细胞绝对值', value: 0 },
      ]),
    ).toEqual([])
  })

  it('summarizes latest abnormal readings per category without counting missing references as abnormal', () => {
    const summaries = summarizeLatestAbnormalByCategory([
      { category: 'blood-routine', itemCode: 'wbc', itemName: '白细胞', testDate: '2026-05-01', value: 6.2 },
      { category: 'blood-routine', itemCode: 'wbc', itemName: '白细胞', testDate: '2026-05-10', value: 2.8 },
      { category: 'blood-routine', itemCode: 'unknown', itemName: '未知指标', testDate: '2026-05-10', value: 99 },
      { category: 'blood-biochemistry', itemCode: 'alt', itemName: 'ALT', testDate: '2026-05-09', value: 55 },
    ])

    expect(summaries.find((item) => item.category === 'blood-routine')).toMatchObject({
      abnormalReadings: [{ itemCode: 'wbc', status: 'low', testDate: '2026-05-10' }],
      latestDate: '2026-05-10',
      missingReferenceCount: 1,
    })
    expect(summaries.find((item) => item.category === 'blood-biochemistry')?.abnormalReadings[0]).toMatchObject({
      itemCode: 'alt',
      status: 'high',
    })
  })

  it('builds chart-ready series and excludes undated readings from line points', () => {
    expect(
      buildLabChartSeries(
        [
          { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', value: 7 },
          { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2026-04-01', value: 4.8 },
          { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2026-05-01', value: 6.2 },
        ],
        'cea',
      ),
    ).toMatchObject({
      itemCode: 'cea',
      points: [
        { date: '2026-04-01', status: 'normal' },
        { date: '2026-05-01', status: 'high' },
      ],
      undatedCount: 1,
    })
  })

  it('detects tumor markers with two consecutive rises greater than 20 percent only', () => {
    const alerts = detectTumorMarkerContinuousRise([
      { category: 'tumor-marker', itemCode: 'ca15_3', itemName: 'CA15-3', testDate: '2026-03-01', value: 20, unit: 'U/mL' },
      { category: 'tumor-marker', itemCode: 'ca15_3', itemName: 'CA15-3', testDate: '2026-04-01', value: 25, unit: 'U/mL' },
      { category: 'tumor-marker', itemCode: 'ca15_3', itemName: 'CA15-3', testDate: '2026-05-01', value: 32, unit: 'U/mL' },
      { category: 'blood-biochemistry', itemCode: 'alt', itemName: 'ALT', testDate: '2026-03-01', value: 20 },
      { category: 'blood-biochemistry', itemCode: 'alt', itemName: 'ALT', testDate: '2026-04-01', value: 30 },
      { category: 'blood-biochemistry', itemCode: 'alt', itemName: 'ALT', testDate: '2026-05-01', value: 40 },
    ])

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      intervalRiseRatios: [0.25, 0.28],
      itemCode: 'ca15_3',
      unit: 'U/mL',
    })
  })

  it('detects the latest matching tumor-marker rise window even when the latest readings stabilize', () => {
    const alerts = detectTumorMarkerContinuousRise([
      { category: 'tumor-marker', itemCode: 'ca15_3', itemName: '糖类抗原153', testDate: '2025-07-19', value: 7.9, unit: 'U/mL' },
      { category: 'tumor-marker', itemCode: 'ca15_3', itemName: '糖类抗原153', testDate: '2025-10-16', value: 10, unit: 'U/mL' },
      { category: 'tumor-marker', itemCode: 'ca15_3', itemName: '糖类抗原153', testDate: '2025-11-12', value: 15.3, unit: 'U/mL' },
      { category: 'tumor-marker', itemCode: 'ca15_3', itemName: '糖类抗原153', testDate: '2026-04-02', value: 16.7, unit: 'U/mL' },
      { category: 'tumor-marker', itemCode: 'ca15_3', itemName: '糖类抗原153', testDate: '2026-04-30', value: 18.6, unit: 'U/mL' },
    ])

    expect(alerts).toHaveLength(1)
    expect(alerts[0].points.map((point) => point.date)).toEqual(['2025-07-19', '2025-10-16', '2025-11-12'])
    expect(alerts[0].intervalRiseRatios[0]).toBeCloseTo(0.266)
    expect(alerts[0].intervalRiseRatios[1]).toBeCloseTo(0.53)
  })
})
