/**
 * [INPUT]: 依赖 react-dom/server 的静态渲染，依赖 LocaleProvider，依赖 workspace 的 ExtractionComposer 与 ReportPreviewFrame。
 * [OUTPUT]: 对外提供已有病历编辑/新病历提取分流、工作台姓名/性别/年龄/身高/体重展示、BMI/患者类型标签隐藏、Dense Clinical Ledger 预览、诊断日期前置、紧凑治疗时间线、最新检测摘要与预览提示条显隐回归测试。
 * [POS]: routes 的工作区局部合同测试，承接 workspace-page.test.tsx 的人口学指标、模式分流、ledger 预览和预览提示条断言，保持主测试文件不越过 800 行结构门禁。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ExtractionComposer } from '@/components/workspace/extraction-composer'
import { ReportPreviewFrame } from '@/components/workspace/report-preview-frame'
import { LocaleProvider } from '@/lib/locale'
import type { PatientRecord } from '@/types/patient'

import {
  getConfirmedOcrText,
  getFailedOcrImportPatch,
  getFollowUpPersistenceFailurePatch,
  getWorkspaceComposerMode,
} from '@/lib/workspace/state'

describe('WorkspacePage metrics and record mode contracts', () => {
  it('makes existing-record input mode explicit and exposes a separate new-record extraction action', () => {
    expect(getWorkspaceComposerMode({ treatmentLines: [] })).toBe('edit')
    expect(getWorkspaceComposerMode(null)).toBe('extract')

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <MemoryRouter>
          <ExtractionComposer
          composerMode={getWorkspaceComposerMode({ treatmentLines: [] })}
          error={null}
          extractionInput="把身高改成 168，体重改成 62"
          isExtracting={false}
          isSaving={false}
          onExtract={() => undefined}
          onExtractAsNew={() => undefined}
          onInputChange={() => undefined}
          onRetry={() => undefined}
          remainingMissingCount={0}
          retryMode={null}
          theme="light"
        />
        </MemoryRouter>
      </LocaleProvider>,
    )

    expect(markup).toContain('应用病历修改')
    expect(markup).toContain('作为新病历提取')
    expect(markup).not.toContain('开始结构化提取')
  })

  it('builds a follow-up persistence failure patch that restores the previous record', () => {
    const previousRecord: PatientRecord = {
      basicInfo: { age: 63 },
      treatmentLines: [{ lineNumber: 1, regimen: '奥希替尼' }],
    }
    const patch = getFollowUpPersistenceFailurePatch(previousRecord, '补充回答', 1, 'zh')

    expect(patch.record).toBe(previousRecord)
    expect(patch.remainingMissing).toEqual(['tumorType', 'stage'])
    expect(patch.retryAnswer).toBe('补充回答')
    expect(patch.retryMode).toBe('follow-up')
  })

  it('builds a failed OCR patch without mutating the current patient record', () => {
    const current = {
      record: { basicInfo: { tumorType: '乳腺癌' }, treatmentLines: [] },
      remainingMissing: ['分期'],
    } satisfies { record: PatientRecord; remainingMissing: string[] }
    const patch = getFailedOcrImportPatch(current, new Error('network'), 'zh')

    expect(patch.record).toBe(current.record)
    expect(patch.remainingMissing).toBe(current.remainingMissing)
    expect(patch.ocr).toMatchObject({ isProcessing: false, text: null })
    expect(patch.ocr.error).toBeTruthy()
  })

  it('normalizes confirmed OCR text before extraction', () => {
    expect(getConfirmedOcrText('  影像报告文本  ')).toBe('影像报告文本')
    expect(getConfirmedOcrText('   ')).toBeNull()
    expect(getConfirmedOcrText(null)).toBeNull()
  })

  it('renders recovered demographics in the workspace preview while leaving BMI out', () => {
    const record: PatientRecord = {
      basicInfo: { age: 60, gender: '女', height: 170, name: '张三', weight: 60 },
      treatmentLines: [],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={[]}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).toContain('姓名')
    expect(markup).toContain('张三')
    expect(markup).toContain('性别')
    expect(markup).toContain('>女</span>')
    expect(markup).toContain('年龄')
    expect(markup).toContain('60 岁')
    expect(markup).toContain('身高')
    expect(markup).toContain('170 cm')
    expect(markup).toContain('体重')
    expect(markup).toContain('60 kg')
    expect(markup).toContain('data-editable-field="basicInfo.name"')
    expect(markup).toContain('data-editable-field="basicInfo.gender"')
    expect(markup).toContain('data-editable-field="basicInfo.age"')
    expect(markup).toContain('data-editable-field="basicInfo.height"')
    expect(markup).toContain('data-editable-field="basicInfo.weight"')
    expect(markup).not.toContain('BMI')
    expect(markup).not.toContain('22.0')
    expect(markup).not.toContain('患者类型')
    expect(markup).not.toContain('非晚期')
    expect(markup).not.toContain('Archetype')
    expect(markup).not.toContain('Non-Advanced')
  })

  it('renders the preview basic fields as a dense clinical ledger with subtle missing markers', () => {
    const record: PatientRecord = {
      basicInfo: { age: 63, height: 168, weight: 62 },
      treatmentLines: [],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={['肿瘤类型', '分期', '治疗方案']}
          setReportRef={() => undefined}
          theme="dark"
        />
      </LocaleProvider>,
    )

    expect(markup).toContain('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5')
    expect(markup).toContain('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')
    expect(markup).toContain('data-ledger-missing-bar="true"')
    expect(markup).toContain('border-b border-r border-[var(--ff-border-default)]')
    expect(markup).not.toContain('min-h-[64px]')
    expect(markup).not.toContain('bg-[var(--ff-surface-warning)]')
  })

  it('keeps every preview identity and evidence field editable and moves other information into clinical notes', () => {
    const record: PatientRecord = {
      basicInfo: {
        height: 168,
        name: '林某',
        weight: 62,
      },
      clinicalNotes: '其他信息：患者自述乏力，需结合复查资料确认。',
      treatmentLines: [
        {
          geneticTest: 'EGFR 19del',
          immunohistochemistry: 'TTF-1(+)',
          lineNumber: 1,
          regimen: '奥希替尼',
        },
      ],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={[]}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).toContain('data-editable-field="basicInfo.name"')
    expect(markup).toContain('data-editable-field="treatmentLine.1.geneticTest"')
    expect(markup).toContain('data-editable-field="treatmentLine.1.immunohistochemistry"')
    expect(markup).toContain('data-editable-field="record.clinicalNotes"')
    expect(markup).toContain('其他信息：患者自述乏力')
    expect(markup.match(/临床备注/g)).toHaveLength(1)
    expect(markup).not.toContain('>备注内容<')
    expect(markup).not.toContain('>其他信息<')
  })

  it('shows only the latest genetic and immunohistochemistry results in the summary and moves older tests below notes', () => {
    const record: PatientRecord = {
      basicInfo: {
        tumorType: '肺癌',
      },
      clinicalNotes: '需复核外院病理原件。',
      initialOnset: {
        geneticTest: '2021 组织 NGS：EGFR 19del',
        immunohistochemistry: '2021 IHC：TTF-1(+)',
        treatment: '同步放化疗',
      },
      treatmentLines: [
        {
          geneticTest: '2023 血液 NGS：未见 T790M',
          immunohistochemistry: '2023 IHC：PD-L1 10%',
          lineNumber: 1,
          regimen: '奥希替尼',
        },
        {
          geneticTest: '2024 组织 NGS：MET 扩增',
          immunohistochemistry: '2024 IHC：PD-L1 50%',
          lineNumber: 2,
          regimen: '培美曲塞+卡铂',
        },
      ],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={[]}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).toContain('基因检测（最新）')
    expect(markup).toContain('免疫组化（最新）')
    expect(markup).toContain('data-editable-field="treatmentLine.2.geneticTest"')
    expect(markup).toContain('data-editable-field="treatmentLine.2.immunohistochemistry"')
    expect(markup).toContain('2024 组织 NGS：MET 扩增')
    expect(markup).toContain('2024 IHC：PD-L1 50%')
    expect(markup).toContain('既往检测历史')
    expect(markup).toContain('基因检测 · 初发')
    expect(markup).toContain('基因检测 · 1L 治疗线')
    expect(markup).toContain('免疫组化 · 初发')
    expect(markup).toContain('免疫组化 · 1L 治疗线')
    expect(markup).toContain('2021 组织 NGS：EGFR 19del')
    expect(markup).toContain('2023 IHC：PD-L1 10%')
  })

  it('places diagnosis date before regimen and keeps regimen next to latest evidence', () => {
    const record: PatientRecord = {
      basicInfo: {
        diagnosisDate: '2023-01-08',
        stage: 'IV期',
        tumorType: '肺腺癌',
      },
      treatmentLines: [
        {
          geneticTest: 'EGFR 19del',
          immunohistochemistry: 'TTF-1(+)',
          lineNumber: 1,
          regimen: '奥希替尼',
        },
      ],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={[]}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup.indexOf('data-editable-field="basicInfo.stage"')).toBeLessThan(
      markup.indexOf('data-editable-field="basicInfo.diagnosisDate"'),
    )
    expect(markup.indexOf('data-editable-field="basicInfo.diagnosisDate"')).toBeLessThan(
      markup.indexOf('data-editable-field="treatmentLine.1.regimen"'),
    )
    expect(markup.indexOf('data-editable-field="treatmentLine.1.regimen"')).toBeLessThan(
      markup.indexOf('data-editable-field="treatmentLine.1.geneticTest"'),
    )
  })

  it('renders treatment history as a compact clinical course track', () => {
    const record: PatientRecord = {
      initialOnset: {
        treatment: '同步放化疗',
        triggerDate: '2022-01-10',
      },
      treatmentLines: [
        {
          endDate: '2024-03-01',
          lineNumber: 1,
          regimen: '奥希替尼',
          startDate: '2023-02-01',
        },
        {
          lineNumber: 2,
          regimen: '培美曲塞+卡铂',
          startDate: '2024-04-01',
        },
      ],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={[]}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).toContain('data-preview-timeline="clinical-course"')
    expect(markup).toContain('初发治疗')
    expect(markup).toContain('2022-01-10')
    expect(markup).toContain('1L 治疗线')
    expect(markup).toContain('2023-02-01 → 2024-03-01')
    expect(markup).toContain('2L 治疗线')
    expect(markup).toContain('2024-04-01 起')
    expect(markup).toContain('同步放化疗')
    expect(markup).toContain('培美曲塞+卡铂')
    expect(markup).not.toContain('暂无治疗线内容')
    expect(markup).not.toContain('md:min-w-max')
    expect(markup).not.toContain('border-dashed')
  })

  it('hides completed missing-field and follow-up badges from the preview header', () => {
    const record: PatientRecord = {
      basicInfo: { stage: 'IA期', tumorType: '乳腺癌' },
      treatmentLines: [{ lineNumber: 1, regimen: '阿贝西利+氟维司群' }],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          followUpCount={0}
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={[]}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).not.toContain('必填字段 / 缺失字段')
    expect(markup).not.toContain('chat_bubble')
    expect(markup).not.toContain('0 项 · 第')
  })

  it('keeps the follow-up progress badge only while missing fields remain', () => {
    const record: PatientRecord = {
      basicInfo: { tumorType: '乳腺癌' },
      treatmentLines: [],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          followUpCount={1}
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={['分期', '治疗方案']}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).not.toContain('必填字段 / 缺失字段')
    expect(markup).toContain('待补充')
    expect(markup).toContain('/3 轮追问')
  })
})
