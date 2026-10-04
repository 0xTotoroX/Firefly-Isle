/**
 * [INPUT]: 依赖 vitest 的 describe/it/expect，依赖 ./patient 的 getPatientArchetype 与 PatientRecord。
 * [OUTPUT]: 对外提供 PatientRecord archetype 判定的回归测试集。
 * [POS]: types 的最小领域测试文件，给 CI 提供稳定的 archetype 基线校验。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import { getPatientArchetype, type PatientRecord } from './patient'

describe('getPatientArchetype', () => {
  it('returns non-advanced when only basic info exists', () => {
    const record: PatientRecord = {
      basicInfo: { tumorType: '肺腺癌' },
      treatmentLines: [],
    }

    expect(getPatientArchetype(record)).toBe('non-advanced')
  })

  it('returns de-novo-advanced when treatment lines exist without initial onset', () => {
    const record: PatientRecord = {
      basicInfo: { tumorType: '肺腺癌' },
      treatmentLines: [{ lineNumber: 1, regimen: '培美曲塞+卡铂' }],
    }

    expect(getPatientArchetype(record)).toBe('de-novo-advanced')
  })

  it('returns relapsed-advanced when both initial onset and treatment lines exist', () => {
    const record: PatientRecord = {
      basicInfo: { tumorType: '肺腺癌' },
      initialOnset: { treatment: '术后辅助治疗' },
      treatmentLines: [{ lineNumber: 1, regimen: '多西他赛' }],
    }

    expect(getPatientArchetype(record)).toBe('relapsed-advanced')
  })
})
