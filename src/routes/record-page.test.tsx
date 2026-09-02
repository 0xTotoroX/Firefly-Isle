/**
 * [INPUT]: 依赖 node:fs 的源码合同检查，依赖 react-dom/server 的静态渲染，依赖 react-router-dom 的 MemoryRouter，依赖 vitest 的模块 mock，依赖 BackgroundAudioProvider、./record-page、./record-page.view 与 ./record-page.logic。
 * [OUTPUT]: 对外提供病例详情页平面阅读层、响应式版心、公开 Demo 完整产品预览、Demo 模式提醒、dossier/极简表格/Gantt 文字页签切换、当前病历编辑工具条、字段级保存状态、日期范围 patch、默认病例逐线档案、页头去重、癌种概要、人口学/体格指标/多段检查证据概要、BL/L 标记、时间线 rail 逐线时间段/每线 PFS、编号/标题/补充资料去重、全站动效与导出职责回归测试。
 * [POS]: routes 的病例详情测试文件，约束 /record/:id 与 /demo/record 使用 V3 宽幅 shell 合同而不是旧 980px 固定画布，承接背景音 topbar、Demo banner、TimelineTable/Gantt 备用视图、Demo AI/分享/指标预览、默认病例档案内容、字段级 Supabase 保存边界、页头/时间线不重复摘要、年龄/性别/身高/体重/BMI/基因与免疫组化证据、档案/表格/Gantt 动效、BL/L1/L2 标记与 PDF/PNG 导出入口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { summaryMetrics } from '@/components/record/record-copy'
import { demoPatientRecord } from '@/components/record/demo-record'
import { demoLabAnalyticsRecord } from '@/components/analytics/demo-lab-analytics'
import { getRecordSummaryMetrics } from '@/components/record/record-derived'
import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'
import { shellWideContentClass } from '@/lib/theme/tokens'
import type { PatientRecord } from '@/types/patient'

let currentTheme: 'light' | 'dark' = 'light'
const localStorageState = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string) => localStorageState.get(key) ?? null,
  removeItem: (key: string) => {
    localStorageState.delete(key)
  },
  setItem: (key: string, value: string) => {
    localStorageState.set(key, value)
  },
}

vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('window', { localStorage: localStorageMock })

beforeEach(() => {
  localStorageState.clear()
})

afterEach(() => {
  localStorageState.clear()
})

vi.mock('@/lib/theme', async () => {
  const actual = await vi.importActual<typeof import('@/lib/theme')>('@/lib/theme')

  return {
    ...actual,
    useTheme: () => ({
      accent: '#E85D2A',
      setAccent: vi.fn(),
      theme: currentTheme,
      toggleTheme: vi.fn(),
    }),
  }
})

import { parseRecordRangeEdits, RecordPage } from './record-page'
import { RecordPageContent } from './record-page.view'
import type { RecordExportState, RecordViewMode } from './record-page.view'
import type { RecordLoadState } from './record-page.logic'

function readRecordRouteSource() {
  return ['./record-page.tsx', './record-page.logic.ts'].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n')
}

function readTransitionsSource() {
  return readFileSync(new URL('../styles/transitions-dev.css', import.meta.url), 'utf8')
}

function renderRecord(theme: 'light' | 'dark', initialEntry = '/record/demo') {
  currentTheme = theme

  return renderToStaticMarkup(
    <LocaleProvider>
      <BackgroundAudioProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/record/:id" element={<RecordPage isSigningOut={false} onSignOut={() => undefined} userLabel="ANON_SESSION" />} />
            <Route path="/demo/record" element={<RecordPage userIsAnonymous userLabel="DEMO_MODE" />} />
          </Routes>
        </MemoryRouter>
      </BackgroundAudioProvider>
    </LocaleProvider>,
  )
}

function renderRecordContent({
  demoRoute = false,
  record,
  viewMode,
}: {
  demoRoute?: boolean
  record?: PatientRecord
  viewMode: RecordViewMode
}) {
  const exportState: RecordExportState = {
    error: null,
    format: null,
    isExporting: false,
  }
  const activeRecordLoadState: RecordLoadState = {
    error: null,
    isLoading: false,
    record: record ?? null,
    recordId: record?.id ?? null,
  }

  return renderToStaticMarkup(
    <LocaleProvider>
      <MemoryRouter initialEntries={[demoRoute ? '/record/demo' : '/record/patient-42']}>
        <RecordPageContent
          activeRecordLoadState={activeRecordLoadState}
          demoRecord={record ?? demoPatientRecord}
          demoRoute={demoRoute}
          exportState={exportState}
          isChartEditing={false}
          locale="zh"
          onChartEditingChange={() => undefined}
          onCommitField={() => undefined}
          onCommitRange={() => undefined}
          onExport={() => undefined}
          onViewModeChange={() => undefined}
          recordRef={createRef<HTMLDivElement>()}
          saveState={{ error: null, status: 'idle' }}
          theme={currentTheme}
          viewMode={viewMode}
        />
      </MemoryRouter>
    </LocaleProvider>,
  )
}

function getMetricValue(metrics: { label: string; value: string }[], label: string) {
  return metrics.find((metric) => metric.label === label)?.value ?? ''
}

describe('RecordPage responsive dossier shell', () => {
  it.each(['light', 'dark'] as const)('uses the shared wide shell contract in %s mode', (theme) => {
    const markup = renderRecord(theme)

    expect(markup).toContain('data-testid="record-responsive-canvas"')
    expect(markup).toContain(shellWideContentClass)
    expect(markup).not.toContain('max-w-[980px]')
  })

  it('keeps the evidence column responsive instead of locking it to one desktop width', () => {
    const markup = renderRecord('light')

    expect(markup).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(260px,32%)]')
    expect(markup).toContain('2xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]')
  })

  it('places PDF and PNG export actions on the record page', () => {
    const markup = renderRecord('light', '/record/patient-42')

    expect(markup).toContain('导出 PDF')
    expect(markup).toContain('导出 PNG')
  })

  it('exposes a dossier/table/Gantt view switch on demo records', () => {
    const markup = renderRecord('light')

    expect(markup).toContain('档案视图')
    expect(markup).toContain('极简表格')
    expect(markup).toContain('甘特图视图')
  })

  it('renders public Demo record as a full-product showcase without live LLM or real share writes', () => {
    const markup = renderRecord('light', '/demo/record')

    expect(markup).toContain('href="/demo/record"')
    expect(markup).toContain('href="/demo/analytics"')
    expect(markup).toContain('data-testid="demo-mode-banner"')
    expect(markup).toContain('当前为 Demo 视图')
    expect(markup).toContain('AI 辅助分析')
    expect(markup).toContain('Demo 示例仅展示病历整理和随访沟通方式')
    expect(markup).toContain('指标趋势摘要')
    expect(markup).toContain('授权码分享')
    expect(markup).toContain('Demo 只展示分享入口形态')
    expect(markup).toContain('实验室趋势')
    expect(markup).toContain('糖类抗原153')
    expect(markup).toContain('导出 PDF')
    expect(markup).toContain('导出 PNG')
    expect(markup).toContain('<details')
    expect(markup).not.toContain('<details open=')
    expect(markup).not.toContain('AI VERIFIED')
    expect(markup).not.toContain('数据完整性')
    expect(markup).not.toContain('LAST_UPDATE')
    expect(markup).not.toContain('2024-05-20 12:08:00')
    expect(markup).not.toContain('系统状态：就绪')
    expect(markup).not.toContain('href="/analytics/demo"')
  })

  it('exposes a compact page-level editing toggle', () => {
    const markup = renderRecord('dark')

    expect(markup).toContain('编辑病历')
    expect(markup).toContain('aria-pressed="false"')
    expect(markup).not.toContain('当前病历：乳腺癌')
    expect(markup).not.toContain('当前病历：未命名病历')
    expect(markup).not.toContain('开启图表编辑')
    expect(markup).not.toContain('编辑图表')
  })

  it('mounts record pages into the shared route reveal motion layer', () => {
    const markup = renderRecord('dark')

    expect(markup).toContain('t-route-reveal')
    expect(markup).not.toContain('t-route-reveal t-stagger')
    expect(markup).not.toContain('t-stagger t-route-reveal')
  })

  it('uses a tab-switch contract for dossier, table and Gantt view changes', () => {
    const dossierMarkup = renderRecordContent({
      demoRoute: true,
      viewMode: 'dossier',
    })
    const tableMarkup = renderRecordContent({
      demoRoute: true,
      viewMode: 'table',
    })
    const ganttMarkup = renderRecordContent({
      demoRoute: true,
      viewMode: 'gantt',
    })
    const transitionsSource = readTransitionsSource()

    expect(dossierMarkup).toContain('t-tab-switch')
    expect(dossierMarkup).toContain('role="tablist"')
    expect(dossierMarkup).toContain('role="tab"')
    expect(dossierMarkup).toContain('aria-selected="true"')
    expect(dossierMarkup).toContain('aria-selected="false"')
    expect(dossierMarkup).toContain('tabindex="0"')
    expect(dossierMarkup).toContain('tabindex="-1"')
    expect(dossierMarkup).not.toContain('aria-pressed="true"')
    expect(dossierMarkup).toContain('border-b-2')
    expect(dossierMarkup).toContain('data-active-page="dossier"')
    expect(tableMarkup).toContain('data-active-page="table"')
    expect(ganttMarkup).toContain('data-active-page="gantt"')
    expect(dossierMarkup).not.toContain('t-tab-switch-slider')
    expect(dossierMarkup).not.toContain('t-tab-switch-thumb')
    expect(dossierMarkup).not.toContain('--tab-switch-index')
    expect(transitionsSource).not.toContain('.t-tab-switch-thumb')
    expect(transitionsSource).not.toContain('@keyframes t-tab-switch-pop')
  })

  it('renders the minimal TimelineTable view for real record content without hijacking dossier export', () => {
    const markup = renderRecordContent({
      record: demoPatientRecord,
      viewMode: 'table',
    })

    expect(markup).toContain('时间线表格')
    expect(markup).toContain('基本信息')
    expect(markup).toContain('氟唑帕利 + 哌柏西利 + 托瑞米芬')
    expect(markup).not.toContain('导出 PDF')
    expect(markup).not.toContain('导出 PNG')
  })

  it('renders the Gantt view for demo records through the record content layer', () => {
    const markup = renderRecordContent({
      demoRoute: true,
      viewMode: 'gantt',
    })

    expect(markup).toContain('治疗方案')
    expect(markup).toContain('氟唑帕利 + 哌柏西利 + 托瑞米芬')
    expect(markup).toContain('PFS=约5.8个月')
    expect(markup).toContain('PTEN 拷贝数缺失')
    expect(markup).not.toContain('张三')
    expect(markup).not.toContain('NSCLC')
    expect(markup).not.toContain('奥希替尼')
    expect(markup).not.toContain('当前治疗线')
    expect(markup).toContain('t-record-view')
  })

  it('can render dossier and Gantt values as editable when page editing is enabled', () => {
    const exportState: RecordExportState = {
      error: null,
      format: null,
      isExporting: false,
    }
    const activeRecordLoadState: RecordLoadState = {
      error: null,
      isLoading: false,
      record: null,
      recordId: null,
    }

    const dossierMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/record/demo']}>
        <RecordPageContent
          activeRecordLoadState={activeRecordLoadState}
          demoRecord={demoPatientRecord}
          demoRoute
          exportState={exportState}
          isChartEditing
          locale="zh"
          onChartEditingChange={() => undefined}
          onCommitField={() => undefined}
          onCommitRange={() => undefined}
          onExport={() => undefined}
          onViewModeChange={() => undefined}
          recordRef={createRef<HTMLDivElement>()}
          saveState={{ error: null, status: 'idle' }}
          theme={currentTheme}
          viewMode="dossier"
        />
      </MemoryRouter>,
    )
    const ganttMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/record/demo']}>
        <RecordPageContent
          activeRecordLoadState={activeRecordLoadState}
          demoRecord={demoPatientRecord}
          demoRoute
          exportState={exportState}
          isChartEditing
          locale="zh"
          onChartEditingChange={() => undefined}
          onCommitField={() => undefined}
          onCommitRange={() => undefined}
          onExport={() => undefined}
          onViewModeChange={() => undefined}
          recordRef={createRef<HTMLDivElement>()}
          saveState={{ error: null, status: 'idle' }}
          theme={currentTheme}
          viewMode="gantt"
        />
      </MemoryRouter>,
    )

    expect(dossierMarkup).toContain('完成编辑')
    expect(dossierMarkup).not.toContain('关闭图表编辑')
    expect(dossierMarkup).toContain('contenteditable="true"')
    expect(dossierMarkup).toContain('role="textbox"')
    expect(ganttMarkup).toContain('编辑BL时间段')
    expect(ganttMarkup).toContain('contenteditable="true"')
  })

  it('shows record edit save status in the shared toolbar', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/record/demo']}>
        <RecordPageContent
          activeRecordLoadState={{ error: null, isLoading: false, record: null, recordId: null }}
          demoRecord={demoPatientRecord}
          demoRoute
          exportState={{ error: null, format: null, isExporting: false }}
          isChartEditing
          locale="zh"
          onChartEditingChange={() => undefined}
          onCommitField={() => undefined}
          onCommitRange={() => undefined}
          onExport={() => undefined}
          onViewModeChange={() => undefined}
          recordRef={createRef<HTMLDivElement>()}
          saveState={{ error: null, status: 'saving' }}
          theme={currentTheme}
          viewMode="dossier"
        />
      </MemoryRouter>,
    )

    expect(markup).toContain('保存中...')
    expect(markup).toContain('role="status"')
  })

  it('converts edited date ranges into field-level record patches', () => {
    const edits = parseRecordRangeEdits({
      end: { field: 'endDate', lineNumber: 1, section: 'treatmentLine' },
      start: { field: 'startDate', lineNumber: 1, section: 'treatmentLine' },
    }, '2024.01 - 至今')

    expect(edits).toEqual([
      { target: { field: 'startDate', lineNumber: 1, section: 'treatmentLine' }, value: '2024.01' },
      { target: { field: 'endDate', lineNumber: 1, section: 'treatmentLine' }, value: '' },
    ])
  })

  it('renders the Gantt view for persisted records without demo fallback values', () => {
    const markup = renderRecordContent({
      record: {
        basicInfo: { tumorType: 'NSCLC' },
        id: 'patient-42',
        treatmentLines: [
          { endDate: '2024-02', lineNumber: 1, regimen: 'Real first line', startDate: '2023-05' },
          { lineNumber: 2, regimen: 'Real current line', startDate: '2024-03' },
        ],
      },
      viewMode: 'gantt',
    })

    expect(markup).toContain('Real first line')
    expect(markup).toContain('Real current line')
    expect(markup).not.toContain('张三')
  })

  it('renders lab trends for persisted records on the dossier view', () => {
    const markup = renderRecordContent({
      record: {
        id: 'patient-42',
        labResults: [
          { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2024-01-01', value: 8.1, unit: 'ng/mL' },
          { category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', testDate: '2024-02-01', value: 9.3, unit: 'ng/mL' },
        ],
        treatmentLines: [],
      },
      viewMode: 'dossier',
    })

    expect(markup).toContain('实验室趋势')
    expect(markup).toContain('持续增高')
  })

  it('uses the same compact detail format for persisted treatment lines', () => {
    const markup = renderRecordContent({
      record: {
        id: 'patient-42',
        treatmentLines: [
          {
            biopsy: '2024.01 肝转',
            endDate: '2024.03',
            geneticTest: 'PTEN 缺失',
            immunohistochemistry: 'ER-，PR-，HER2 0',
            lineNumber: 1,
            regimen: '真实治疗方案',
            startDate: '2024.01',
          },
        ],
      },
      viewMode: 'dossier',
    })

    expect(markup).toContain('2024.01 - 2024.03')
    expect(markup).toContain('真实治疗方案')
    expect(markup).toContain('>L1</span>')
    expect(markup).toContain('PFS=2个月')
    expect(markup).not.toContain('/ 一线治疗')
    expect(markup).toContain('免疫组化')
    expect(markup).toContain('基因检测')
    expect(markup).toContain('补充资料')
    expect(markup).toContain('2024.01 肝转')
    expect(markup).not.toContain('开始日期')
    expect(markup).not.toContain('结束日期')
    expect(markup).not.toContain('活检：')
    expect(markup).not.toContain('1L 治疗')
    expect(markup).not.toContain('/ 治疗线 1')
    expect(markup).not.toContain('>补充资料</span><span')
  })

  it('renders persisted rail dates and treatment-line PFS on first-line start', () => {
    const markup = renderRecordContent({
      record: {
        id: 'patient-42',
        initialOnset: {
          triggerDate: '2021.07',
          treatment: '初发治疗方案',
        },
        treatmentLines: [
          {
            endDate: '2023.05',
            lineNumber: 1,
            regimen: '一线治疗方案',
            startDate: '2022.10',
          },
          {
            lineNumber: 2,
            regimen: '二线治疗方案',
            startDate: '2023.06',
          },
        ],
      },
      viewMode: 'dossier',
    })

    expect(markup).toContain('data-timeline-rail-date="2021.07-2022.10"')
    expect(markup).toContain('data-timeline-rail-date="2022.10-2023.05"')
    expect(markup).toContain('data-timeline-rail-date="2023.06-至今"')
    expect(markup).toContain('>BL</span>')
    expect(markup).toContain('>L1</span>')
    expect(markup).toContain('>L2</span>')
    expect(markup).toContain('PFS=7个月')
    expect(markup).toContain('PFS=进行中')
    expect(markup).toContain('data-timeline-mobile-pfs="PFS=7个月"')
    expect(markup).not.toContain('PFS=15个月')
  })

  it('does not render an empty lab trend placeholder for the demo dossier', () => {
    const markup = renderRecordContent({
      demoRoute: true,
      viewMode: 'dossier',
    })

    expect(markup).not.toContain('实验室趋势')
    expect(markup).not.toContain('暂无实验室趋势')
  })

  it('renders every demo treatment as its own dossier timeline entry', () => {
    const markup = renderRecordContent({
      demoRoute: true,
      viewMode: 'dossier',
    })

    expect(markup).not.toContain('初发治疗')
    expect(markup).toContain('>BL</span>')
    expect(markup).toContain('>L1</span>')
    expect(markup).toContain('>L2</span>')
    expect(markup).toContain('>L9</span>')
    expect(markup).not.toContain('>00</span>')
    expect(markup).not.toContain('/ 基线')
    expect(markup).not.toContain('/ 一线治疗')
    expect(markup).not.toContain('/ 二线治疗')
    expect(markup).not.toContain('/ 三线治疗')
    expect(markup).not.toContain('/ 九线治疗')
    expect(markup).toContain('data-timeline-rail-date="2021.07-2022.10"')
    expect(markup).toContain('data-timeline-rail-date="2022.10-2023.05"')
    expect(markup).toContain('data-timeline-rail-date="2023.05-2023.10"')
    expect(markup).toContain('data-timeline-rail-date="2023.10-2023.11"')
    expect(markup).toContain('data-timeline-rail-date="2025.10.01-至今"')
    expect(markup).toContain('md:grid-cols-[56px_12rem_minmax(0,1fr)]')
    expect(markup).toContain('whitespace-nowrap')
    expect(markup).toContain('PFS=7个月')
    expect(markup).toContain('PFS=5个月')
    expect(markup).toContain('PFS=进行中')
    expect(markup).toContain('data-timeline-mobile-pfs="PFS=进行中"')
    expect(markup).toContain('Luminal B；ER90%+，PR90%+，HER2 0，AR30%，Ki67 60%。')
    expect(markup).toContain('阿贝西利 + 氟维司群 + 亮丙瑞林 + 地舒单抗')
    expect(markup).toContain('氟唑帕利 + 哌柏西利 + 托瑞米芬')
    expect(markup).not.toContain('初发免疫组化')
    expect(markup).not.toContain('text-3xl font-bold tracking-normal')
    expect(markup).not.toContain('>治疗</h3>')
    expect(markup).not.toContain('1L 治疗')
    expect(markup).not.toContain('2L 治疗')
    expect(markup).not.toContain('3L 治疗')
    expect(markup).not.toContain('4L 治疗')
    expect(markup).not.toContain('5L 治疗')
    expect(markup).not.toContain('6L 治疗')
    expect(markup).not.toContain('7L 治疗')
    expect(markup).not.toContain('8L 治疗')
    expect(markup).not.toContain('9L 治疗')
    expect(markup).not.toContain('>01</span>')
    expect(markup).not.toContain('>02</span>')
    expect(markup).not.toContain('PFS=15个月')
    expect(markup).not.toContain('/ 治疗线')
    expect(markup).not.toContain('治疗线 1-6')
    expect(markup).not.toContain('治疗线 7-9')
    expect(markup).not.toContain('开始时间')
    expect(markup).not.toContain('结束时间')
    expect(markup).not.toContain('<p>补充资料：')
    expect(markup).not.toContain('>补充资料</span><span')
    expect(markup).not.toContain('<p>该治疗线原始资料')
    expect(markup).not.toContain('补充资料：2023.11 血液 NGS')
    expect(markup).not.toContain('原始资料未记录额外补充信息')
    expect(markup).toContain('2023.10 肝转单发')
    expect(markup).toContain('2023.11 血液 NGS：PTEN 拷贝数缺失')
  })

  it('summarizes demo genetic tests and IHC as dated evidence lines', () => {
    const markup = renderRecordContent({
      demoRoute: true,
      viewMode: 'dossier',
    })
    const geneticTest = getMetricValue(summaryMetrics.zh, '基因检测')
    const ihc = getMetricValue(summaryMetrics.zh, '免疫组化')

    expect(geneticTest).toContain('2023.11：血液 NGS：PTEN 拷贝数缺失')
    expect(geneticTest).toContain('2024.08：PTEN缺失，CCND1/FGFR1扩增')
    expect(ihc).toContain('2021.07：Luminal B；ER90%+')
    expect(ihc).toContain('2024.02：内分泌变三阴')
    expect(ihc).toContain('2024.08：ER-，PR60%')
    expect(markup).toContain('whitespace-pre-line')
  })

  it('summarizes persisted genetic tests and IHC without dropping later lines', () => {
    const metrics = getRecordSummaryMetrics({
      basicInfo: { diagnosisDate: '2021.07' },
      id: 'patient-42',
      initialOnset: {
        geneticTest: '初发 NGS：BRCA1 阴性',
        immunohistochemistry: 'Luminal B；ER90%+，PR90%+',
        triggerDate: '2021.07',
      },
      treatmentLines: [
        {
          geneticTest: '2023.11 血液 NGS：PTEN 拷贝数缺失',
          lineNumber: 3,
          regimen: '三线方案',
          startDate: '2023.10',
        },
        {
          biopsy: '2024.02 肝部穿刺',
          immunohistochemistry: 'ER-，PR5%+，HER2 0',
          lineNumber: 5,
          regimen: '五线方案',
          startDate: '2024.03',
        },
        {
          biopsy: '2024.08 肝穿',
          geneticTest: 'CCND1 扩增',
          immunohistochemistry: 'AR80%，Ki67 80%',
          lineNumber: 6,
          regimen: '六线方案',
          startDate: '2024.08',
        },
      ],
    }, 'zh')

    expect(getMetricValue(metrics, '基因检测')).toBe([
      '2021.07：初发 NGS：BRCA1 阴性',
      '2023.11：血液 NGS：PTEN 拷贝数缺失',
      '2024.08：CCND1 扩增',
    ].join('\n'))
    expect(getMetricValue(metrics, '免疫组化')).toBe([
      '2021.07：Luminal B；ER90%+，PR90%+',
      '2024.02：ER-，PR5%+，HER2 0',
      '2024.08：AR80%，Ki67 80%',
    ].join('\n'))
  })

  it('moves the demo cancer type into the summary metrics instead of the header subtitle', () => {
    const markup = renderRecordContent({
      demoRoute: true,
      viewMode: 'dossier',
    })

    expect(markup).toContain('癌种')
    expect(markup).toContain('乳腺癌')
    expect(markup).not.toContain('乳腺癌 · 复发/晚期 · PTEN / FGFR1')
    expect(markup).not.toContain('CLINICAL HISTORY DOSSIER')
  })

  it('does not repeat demo summary facts inside the initial timeline meta grid', () => {
    const markup = renderRecordContent({
      demoRoute: true,
      viewMode: 'dossier',
    })

    expect(markup.match(/诊断日期/g)).toHaveLength(1)
    expect(markup).not.toContain('临床状态')
    expect(markup).not.toContain('病理类型')
    expect(markup).not.toContain('生物标本状态')
    expect(markup).not.toContain('<p>患者于 2021 年 7 月进入初发治疗阶段。</p>')
    expect(markup).not.toContain('<p>基线治疗包括 AC 方案 4 次、放疗 25+5、依西美坦联合亮丙瑞林。</p>')
  })

  it('derives the persisted record cancer type from basic info summary metrics only', () => {
    const markup = renderRecordContent({
      record: {
        basicInfo: {
          stage: 'IV期',
          tumorType: '黑色素瘤',
        },
        id: 'patient-42',
        treatmentLines: [{ lineNumber: 1, regimen: '真实治疗方案', startDate: '2024.01' }],
      },
      viewMode: 'dossier',
    })

    expect(markup).toContain('癌种')
    expect(markup).toContain('黑色素瘤')
    expect(markup).toContain('黑色素瘤 · IV期')
  })

  it('renders persisted demographics and calculated BMI in the record summary metrics', () => {
    const markup = renderRecordContent({
      record: {
        basicInfo: {
          age: 60,
          gender: '女',
          height: 170,
          weight: 60,
        },
        id: 'patient-42',
        treatmentLines: [],
      },
      viewMode: 'dossier',
    })

    expect(markup).toContain('年龄')
    expect(markup).toContain('60 岁')
    expect(markup).toContain('性别')
    expect(markup).toContain('>女</span>')
    expect(markup).toContain('身高')
    expect(markup).toContain('170 cm')
    expect(markup).toContain('体重')
    expect(markup).toContain('60 kg')
    expect(markup).toContain('BMI')
    expect(markup).toContain('20.8')
  })

  it('renders persisted clinical notes in the record clinical notes section', () => {
    const markup = renderRecordContent({
      record: {
        clinicalNotes: '其他信息：患者自述乏力，需结合复查资料确认。',
        id: 'patient-42',
        treatmentLines: [],
      },
      viewMode: 'dossier',
    })

    expect(markup).toContain('临床备注')
    expect(markup).toContain('其他信息：患者自述乏力')
    expect(markup).not.toContain('所有数据点均经过病理报告与影像诊断交叉验证')
  })

  it('does not repeat persisted basic info inside the initial timeline meta grid', () => {
    const markup = renderRecordContent({
      record: {
        basicInfo: {
          diagnosisDate: '2024.01',
          stage: 'IV期',
          tumorType: '黑色素瘤',
        },
        id: 'patient-42',
        initialOnset: {
          triggerDate: '2024.01',
          treatment: '初发治疗方案',
        },
        treatmentLines: [],
      },
      viewMode: 'dossier',
    })

    expect(markup.match(/诊断日期/g)).toHaveLength(1)
    expect(markup).not.toContain('病理类型')
    expect(markup).not.toContain('记录 ID')
    expect(markup).not.toContain('patient-42')
    expect(markup).not.toContain('初发时间：2024.01')
    expect(markup).not.toContain('治疗方案：初发治疗方案')
  })

  it('keeps export actions scoped to the dossier view instead of the active Gantt view', () => {
    const record: PatientRecord = {
      id: 'patient-42',
      treatmentLines: [{ endDate: '2024-02', lineNumber: 1, regimen: 'Real first line', startDate: '2023-05' }],
    }
    const dossierMarkup = renderRecordContent({ record, viewMode: 'dossier' })
    const ganttMarkup = renderRecordContent({ record, viewMode: 'gantt' })

    expect(dossierMarkup).toContain('导出 PDF')
    expect(dossierMarkup).toContain('导出 PNG')
    expect(ganttMarkup).toContain('治疗方案')
    expect(ganttMarkup).not.toContain('导出 PDF')
    expect(ganttMarkup).not.toContain('导出 PNG')
  })

  it('allows Demo dossier export because Demo is now a showcase surface', () => {
    const markup = renderRecordContent({
      demoRoute: true,
      record: demoLabAnalyticsRecord,
      viewMode: 'dossier',
    })
    const pdfPrefix = markup.slice(Math.max(0, markup.indexOf('导出 PDF') - 240), markup.indexOf('导出 PDF'))
    const pngPrefix = markup.slice(Math.max(0, markup.indexOf('导出 PNG') - 240), markup.indexOf('导出 PNG'))

    expect(markup).toContain('导出 PDF')
    expect(markup).toContain('导出 PNG')
    expect(pdfPrefix).not.toContain('disabled=""')
    expect(pngPrefix).not.toContain('disabled=""')
  })

  it('does not show static demo patient content for arbitrary record ids before loading data', () => {
    const markup = renderRecord('light', '/record/patient-42')

    expect(markup).toContain('正在载入病历')
    expect(markup).not.toContain('张三')
    expect(markup).not.toContain('EGFR L858R')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*导出 PDF/)
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*导出 PNG/)
  })

  it('routes real record ids through the Supabase record loader instead of the demo gate', () => {
    const source = readRecordRouteSource()

    expect(source).toContain('loadPatientRecordById(id)')
    expect(source).toContain('recordLoadState.record')
    expect(source).not.toContain("const isDemoRecord = id === 'demo'")
  })

  it('persists record-page field edits through the patient record storage boundary', () => {
    const source = readRecordRouteSource()

    expect(source).toContain('persistPatientRecord(nextRecord, userId)')
    expect(source).toContain('applyPatientRecordEdit(previousRecord')
    expect(source).toContain('applyPatientRecordEdits(previousRecord')
    expect(source).toContain('setEditableRecord(previousRecord)')
  })

  it('keeps the bulky demo record fixture outside record-copy copywriting', () => {
    const source = readFileSync(new URL('../components/record/record-copy.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('export const demoPatientRecord')
    expect(source).not.toContain('export const demoTreatmentGanttSupplementNotes')
    expect(source).toContain("from './demo-record'")
  })
})
