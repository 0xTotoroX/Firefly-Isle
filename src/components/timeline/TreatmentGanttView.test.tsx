/**
 * [INPUT]: 依赖 react-dom/server 的静态渲染、vitest 断言、PatientRecord 与 ./TreatmentGanttView。
 * [OUTPUT]: 对外提供治疗方案甘特图组件渲染、窄屏紧凑列表、L 标记与动效合同回归测试。
 * [POS]: components/timeline 的展示测试，约束窄屏治疗卡片、桌面左侧方案/PFS/L 标记、中间独立拖动时间轴、右侧补充资料与空态在 DOM 中可读。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PatientRecord } from '@/types/patient'

import { TreatmentGanttView } from './TreatmentGanttView'

function renderGantt(record: PatientRecord) {
  return renderToStaticMarkup(<TreatmentGanttView locale="zh" record={record} />)
}

describe('TreatmentGanttView', () => {
  it('renders fixed side columns and a scrollable treatment timeline', () => {
    const markup = renderGantt({
      initialOnset: {
        immunohistochemistry: 'Luminal B；ER90%+，PR90%+，HER2 0，AR30%，Ki67 60%。',
        treatment: 'AC方案4次 / 放疗25+5 / 依西美坦 + 亮丙',
        triggerDate: '2021.07',
      },
      treatmentLines: [
        {
          biopsy: '2022.10 骨转',
          endDate: '2023.05',
          lineNumber: 1,
          regimen: '阿贝西利 + 氟维司群 + 亮丙瑞林 + 地舒单抗',
          startDate: '2022.10',
        },
        {
          geneticTest: '2023.11 血液 NGS：PTEN 拷贝数缺失，FGFR1 拷贝数扩增，FANCI 胚系突变。',
          endDate: '2023.11',
          lineNumber: 3,
          regimen: '瑞波西利 + 来曲唑片；氟维司群 + 亮丙瑞林 + 地舒单抗',
          startDate: '2023.10',
        },
        {
          lineNumber: 9,
          regimen: '氟唑帕利 + 哌柏西利 + 托瑞米芬',
          startDate: '2025.10.01 起',
        },
      ],
    })

    expect(markup).not.toContain('>甘特图<')
    expect(markup).toContain('治疗方案')
    expect(markup).toContain('data-testid="treatment-gantt-compact-list"')
    expect(markup).toContain('data-testid="treatment-gantt-desktop-grid"')
    expect(markup).toContain('hidden lg:grid')
    expect(markup).toContain('lg:hidden')
    expect(markup).toContain('时间 / 治疗方案')
    expect(markup).toContain('补充信息')
    expect(markup).toContain('PFS=15个月')
    expect(markup).toContain('PFS=7个月')
    expect(markup).toContain('PFS=进行中')
    expect(markup).toContain('2025.10.01-至今')
    expect(markup).toContain('>BL</span>')
    expect(markup).toContain('>L1</span>')
    expect(markup).toContain('>L3</span>')
    expect(markup).toContain('>L9</span>')
    expect(markup).not.toContain('>00</div>')
    expect(markup).not.toContain('>01</div>')
    expect(markup).not.toContain('>03</div>')
    expect(markup).toContain('Luminal B')
    expect(markup).toContain('骨转')
    expect(markup).toContain('血液 NGS')
    expect(markup).toContain('氟唑帕利 + 哌柏西利 + 托瑞米芬')
    expect(markup).toContain('data-testid="treatment-gantt-scroll"')
    expect(markup).toContain('aria-label="可拖动或用左右方向键移动的治疗时间轴"')
    expect(markup).toContain('data-scroll-hint="true"')
    expect(markup.match(/data-testid="treatment-gantt-bar"/g)?.length).toBe(4)
    expect(markup).toContain('t-gantt-grow')
    expect(markup).not.toContain('当前线')
    expect(markup).not.toContain('当前治疗线')
    expect(markup).not.toContain('无效进展</span>')
  })

  it('shows pending rows for missing dates instead of drawing bars', () => {
    const markup = renderGantt({
      treatmentLines: [
        { endDate: '2023-10', lineNumber: 1, regimen: '缺少开始日期' },
        { lineNumber: 2, regimen: '日期无法识别', startDate: '待定' },
      ],
    })

    expect(markup.match(/日期待补充/g)?.length).toBe(4)
    expect(markup).not.toContain('data-testid="treatment-gantt-bar"')
  })

  it('renders an empty state when no treatment lines exist', () => {
    const markup = renderGantt({ treatmentLines: [] })

    expect(markup).toContain('暂无治疗线')
    expect(markup).not.toContain('data-testid="treatment-gantt-bar"')
  })
})
