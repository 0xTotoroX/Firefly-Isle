/**
 * [INPUT]: 依赖 react 的 ReactNode、登录页 Locale/Theme、同源登录 CTA 节点与 openspec/specs 已实现能力文案。
 * [OUTPUT]: 对外提供 LoginStorySections，渲染 hero 之后七章纵向叙事、CSS sticky + spacer 三视图和静态产品示意。
 * [POS]: components/login 的叙事内容层，由 login-entry-view 编排，不持有认证状态、不创建 WebGL 上下文。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { ReactNode } from 'react'

import type { Locale } from '@/lib/locale'
import type { Theme } from '@/lib/theme'

const storyThemeSkins: Record<
  Theme,
  {
    accentLine: string
    body: string
    card: string
    cardMuted: string
    eyebrow: string
    frame: string
    heading: string
    labsSection: string
    layerGlow: string
    line: string
    problemSection: string
    section: string
    tableLine: string
    timelineSection: string
    viewsSection: string
  }
> = {
  dark: {
    accentLine: 'bg-[var(--ff-accent-primary)]',
    body: 'text-[var(--ff-text-secondary)]',
    card: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)]',
    cardMuted: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]',
    eyebrow: 'text-[var(--ff-accent-text)]',
    frame: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)]',
    heading: 'text-[var(--ff-text-primary)]',
    labsSection: 'bg-[var(--ff-surface-inset)]',
    layerGlow: 'bg-transparent',
    line: 'bg-[var(--ff-border-default)]',
    problemSection: 'bg-[var(--ff-surface-base)]',
    section: 'bg-[var(--ff-surface-base)]',
    tableLine: 'border-[var(--ff-border-default)]',
    timelineSection: 'bg-[var(--ff-surface-inset)]',
    viewsSection: 'bg-[var(--ff-surface-base)]',
  },
  light: {
    accentLine: 'bg-[var(--ff-accent-primary)]',
    body: 'text-[var(--ff-text-secondary)]',
    card: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)]',
    cardMuted: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]',
    eyebrow: 'text-[var(--ff-accent-text)]',
    frame: 'border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)]',
    heading: 'text-[var(--ff-text-primary)]',
    labsSection: 'bg-[var(--ff-surface-inset)]',
    layerGlow: 'bg-transparent',
    line: 'bg-[var(--ff-border-default)]',
    problemSection: 'bg-[var(--ff-surface-base)]',
    section: 'bg-[var(--ff-surface-base)]',
    tableLine: 'border-[var(--ff-border-default)]',
    timelineSection: 'bg-[var(--ff-surface-inset)]',
    viewsSection: 'bg-[var(--ff-surface-base)]',
  },
}

function text(locale: Locale, zh: string, en: string) {
  return locale === 'zh' ? zh : en
}

function StoryEyebrow({ index, label, theme }: { index: string; label: string; theme: Theme }) {
  const skin = storyThemeSkins[theme]

  return (
    <div className={`inline-flex items-center gap-3 text-sm font-medium leading-6 ${skin.eyebrow}`}>
      <span className={`h-px w-10 ${skin.accentLine}`} />
      <span>{index}</span>
      <span aria-hidden="true">/</span>
      <span>{label}</span>
    </div>
  )
}

function SectionHeading({
  children,
  className = '',
  id,
  theme,
}: {
  children: ReactNode
  className?: string
  id: string
  theme: Theme
}) {
  return (
    <h2 className={`text-balance whitespace-pre-line text-[clamp(1.75rem,3vw,3rem)] font-semibold leading-[1.2] tracking-normal ${storyThemeSkins[theme].heading} ${className}`} id={id}>
      {children}
    </h2>
  )
}

function ProblemSection({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]
  const fragments = [
    {
      icon: 'route',
      label: text(locale, '多线治疗', 'Multiple treatment lines'),
      detail: text(locale, '方案、疗效与耐药节点跨年份延伸。', 'Regimens, responses, and resistance span years.'),
    },
    {
      icon: 'labs',
      label: text(locale, '反复检验', 'Repeated laboratory tests'),
      detail: text(locale, '同一指标散落在不同批次与日期。', 'The same indicator is scattered across batches and dates.'),
    },
    {
      icon: 'scatter_plot',
      label: text(locale, '信息散落', 'Scattered evidence'),
      detail: text(locale, '病历文本、检查与治疗决策缺少共同顺序。', 'Notes, tests, and treatment decisions lack one shared order.'),
    },
  ]

  return (
    <section
      aria-labelledby="story-problem-title"
      className={`story-section relative flex min-h-[96svh] items-center overflow-hidden py-24 md:py-32 ${skin.problemSection}`}
      data-story-chapter="problem"
      id="story-problem"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-7 md:px-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <div className="story-motion-target" data-story-motion="problem-title">
            <StoryEyebrow index="01" label={text(locale, '问题', 'The problem')} theme={theme} />
            <SectionHeading className="mt-7" id="story-problem-title" theme={theme}>
              {text(locale, '治疗史不是一串文件，\n而是一条需要追溯的线。', 'A treatment history is not a pile of files.\nIt is a line that must remain traceable.')}
            </SectionHeading>
          </div>
          <p
            className={`story-motion-target mt-8 max-w-2xl whitespace-pre-line text-lg font-semibold leading-8 md:text-xl ${skin.body}`}
            data-story-motion="problem-body"
          >
            {text(
              locale,
              '当多线治疗、反复检验和临床判断各自散落，真正困难的不是“保存”，而是还原先后关系与依据。',
              'When treatment lines, repeated tests, and clinical judgments live apart, the hard part is not storage—it is recovering sequence and rationale.',
            )}
          </p>
        </div>

        <div className="relative grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          <div className={`pointer-events-none absolute -inset-12 -z-10 blur-3xl ${skin.layerGlow}`} />
          {fragments.map((fragment, index) => (
            <article
              className={`story-motion-target rounded-[24px] border p-5 backdrop-blur-sm md:p-6 ${skin.card}`}
              data-story-motion="problem-body"
              key={fragment.label}
            >
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined mt-0.5 text-[28px] text-[var(--ff-accent-text)]" aria-hidden="true">
                  {fragment.icon}
                </span>
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className={`font-[var(--ff-font-mono)] text-xs ${skin.body}`}>0{index + 1}</span>
                    <h3 className={`text-lg font-extrabold ${skin.heading}`}>{fragment.label}</h3>
                  </div>
                  <p className={`mt-2 text-sm font-semibold leading-6 ${skin.body}`}>{fragment.detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function IntakeSection({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]
  const steps = [
    {
      icon: 'edit_note',
      title: text(locale, '自然语言录入', 'Natural-language intake'),
      copy: text(locale, '按真实叙述记录诊断、治疗、检查与变化，不必先适配表格。', 'Describe diagnosis, treatment, tests, and changes in the order you know them—without adapting to a form first.'),
      meta: text(locale, '从治疗经过开始', 'Start with your history'),
    },
    {
      icon: 'account_tree',
      title: text(locale, '结构化抽取', 'Structured extraction'),
      copy: text(locale, '提取基本信息、初始治疗与后续方案，保留人工核对和补充。', 'Extract basic information, initial treatment and later regimens for review and completion.'),
      meta: text(locale, '核对后保存', 'Review before saving'),
    },
    {
      icon: 'forum',
      title: text(locale, '按需澄清', 'Clarify only when needed'),
      copy: text(locale, '关键字段仍不足时，最多进行 3 轮澄清，并把待补项留给人工确认。', 'When critical fields remain incomplete, ask up to three clarification rounds and leave unresolved items for manual confirmation.'),
      meta: text(locale, '最多追问 3 轮', 'Up to 3 clarification rounds'),
    },
  ]

  return (
    <section
      aria-labelledby="story-intake-title"
      className={`story-section relative min-h-[108svh] overflow-hidden py-24 md:py-32 ${skin.section}`}
      data-story-chapter="intake"
      id="story-intake"
    >
      <div className="mx-auto w-full max-w-7xl px-7 md:px-14">
        <StoryEyebrow index="02" label={text(locale, '录入', 'Intake')} theme={theme} />
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
          <SectionHeading id="story-intake-title" theme={theme}>
            {text(locale, '先说清楚发生了什么，\n再让结构出现。', 'Say what happened first.\nLet structure emerge second.')}
          </SectionHeading>
          <p className={`max-w-2xl text-lg font-semibold leading-8 lg:justify-self-end ${skin.body}`}>
            {text(locale, '输入、抽取、澄清是一条可回看的链路。结构化不是隐藏原意，而是让原意可查、可改、可继续。', 'Intake, extraction, and clarification form one reviewable chain. Structure does not replace the original meaning; it makes it inspectable and editable.')}
          </p>
        </div>

        <ol className="mt-16 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <li
              className={`story-motion-target relative overflow-hidden rounded-[28px] border p-6 md:p-8 ${skin.card}`}
              data-story-motion="intake-step"
              key={step.title}
            >
              <div className={`absolute left-0 top-0 h-px w-full ${skin.accentLine}`} />
              <div className="flex items-start justify-between gap-5">
                <span className="material-symbols-outlined text-[34px] text-[var(--ff-accent-text)]" aria-hidden="true">
                  {step.icon}
                </span>
                <span className={`font-[var(--ff-font-mono)] text-sm ${skin.body}`}>0{index + 1}</span>
              </div>
              <h3 className={`mt-12 text-2xl font-semibold ${skin.heading}`}>{step.title}</h3>
              <p className={`mt-4 text-base font-semibold leading-7 ${skin.body}`}>{step.copy}</p>
              <div className={`mt-8 border-t pt-4 font-[var(--ff-font-mono)] text-[13px] font-semibold tracking-[0.12em] ${skin.tableLine} ${skin.body}`}>
                {step.meta}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function TimelineSection({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]
  const archetypes = [
    {
      code: 'NON-ADVANCED',
      title: text(locale, '非晚期', 'Non-advanced'),
      onset: true,
      lines: false,
      description: text(locale, '基本信息之后呈现初发与早期治疗，不生成晚期治疗线。', 'Show initial onset and early treatment after basic information, without advanced treatment lines.'),
    },
    {
      code: 'DE-NOVO-ADVANCED',
      title: text(locale, '确诊即晚期', 'De novo advanced'),
      onset: false,
      lines: true,
      description: text(locale, '基本信息之后直接从第 01 治疗线开始，不虚构初发区块。', 'Begin directly with treatment line 01 after basic information, without inventing an initial-onset block.'),
    },
    {
      code: 'RELAPSED-ADVANCED',
      title: text(locale, '复发晚期', 'Relapsed advanced'),
      onset: true,
      lines: true,
      description: text(locale, '保留初诊与早期治疗，再按顺序记录复发后的各次治疗。', 'Keep the original diagnosis and early treatment, then record each later course in order.'),
    },
  ]

  return (
    <section
      aria-labelledby="story-timeline-title"
      className={`story-section relative min-h-[110svh] overflow-hidden py-24 md:py-32 ${skin.timelineSection}`}
      data-story-chapter="timeline"
      id="story-timeline"
    >
      <div className="mx-auto w-full max-w-7xl px-7 md:px-14">
        <div className="max-w-4xl">
          <StoryEyebrow index="03" label={text(locale, '时间线', 'Timeline')} theme={theme} />
          <SectionHeading className="mt-7" id="story-timeline-title" theme={theme}>
            {text(locale, '不是所有患者，\n都该被塞进同一模板。', 'Not every patient belongs\nin the same template.')}
          </SectionHeading>
          <p className={`mt-8 max-w-2xl text-lg font-semibold leading-8 ${skin.body}`}>
            {text(locale, '按实际经历组织初诊、早期治疗和后续方案，未经历的阶段不需要填写。', 'Organize the original diagnosis, early treatment and later regimens around what actually happened. Leave out stages that do not apply.')}
          </p>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {archetypes.map((archetype, index) => (
            <article
              className={`story-motion-target rounded-[28px] border p-6 md:p-7 ${skin.card}`}
              data-story-motion="timeline-card"
              key={archetype.code}
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`font-[var(--ff-font-mono)] text-[13px] font-bold tracking-[0.12em] ${skin.body}`}>{archetype.code}</span>
                <span className="font-[var(--ff-font-mono)] text-sm font-bold text-[var(--ff-accent-text)]">0{index + 1}</span>
              </div>
              <h3 className={`mt-8 text-2xl font-semibold ${skin.heading}`}>{archetype.title}</h3>
              <p className={`mt-3 min-h-[5.25rem] text-sm font-semibold leading-7 ${skin.body}`}>{archetype.description}</p>
              <div className={`mt-7 space-y-3 border-t pt-5 ${skin.tableLine}`}>
                <div className="flex items-center justify-between gap-4 text-sm font-bold">
                  <span className={skin.body}>{text(locale, '初诊与早期治疗', 'Initial treatment')}</span>
                  <span className={archetype.onset ? 'text-[var(--ff-accent-success)]' : skin.body}>{archetype.onset ? 'YES' : '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm font-bold">
                  <span className={skin.body}>{text(locale, '后续治疗', 'Later treatment')}</span>
                  <span className={archetype.lines ? 'text-[var(--ff-accent-success)]' : skin.body}>{archetype.lines ? 'YES' : '—'}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function DossierPreview({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]

  return (
    <article className={`h-full rounded-[22px] border p-5 md:p-7 ${skin.cardMuted}`} data-story-view-panel="dossier">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className={`font-[var(--ff-font-mono)] text-[13px] font-bold tracking-[0.12em] ${skin.body}`}>DOSSIER VIEW</div>
          <h3 className={`mt-2 text-2xl font-semibold ${skin.heading}`}>{text(locale, '档案视图', 'Dossier view')}</h3>
        </div>
        <span className="rounded-full border border-[var(--ff-accent-success)]/24 bg-[var(--ff-accent-success)]/10 px-3 py-1 text-xs font-bold text-[var(--ff-accent-success)]">
          {text(locale, '结构完整', 'Structured')}
        </span>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <div className={`rounded-[18px] border p-4 ${skin.card}`}>
          <div className={`text-xs font-bold ${skin.body}`}>{text(locale, '基本信息', 'Basic information')}</div>
          <div className={`mt-4 text-lg font-semibold ${skin.heading}`}>{text(locale, '诊断与分期摘要', 'Diagnosis and staging')}</div>
          <div className={`mt-5 h-px ${skin.line}`} />
          <div className={`mt-4 space-y-2 text-sm font-semibold ${skin.body}`}>
            <p>{text(locale, '病理与分子信息按阶段归属', 'Pathology and molecular data stay with each phase')}</p>
            <p>{text(locale, '关键缺失字段原位提示', 'Critical missing fields are highlighted in place')}</p>
          </div>
        </div>
        <div className="space-y-3">
          {['01', '02', '03'].map((number, index) => (
            <div className={`flex items-center gap-4 rounded-[18px] border p-4 ${skin.card}`} key={number}>
              <span className="font-[var(--ff-font-mono)] text-lg font-semibold text-[var(--ff-accent-text)]">{number}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-extrabold ${skin.heading}`}>{text(locale, `第 ${index + 1} 线治疗`, `Treatment line ${index + 1}`)}</div>
                <div className={`mt-1 truncate text-xs font-semibold ${skin.body}`}>{text(locale, '方案 · 疗效 · 进展依据', 'Regimen · response · progression evidence')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function TablePreview({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]
  const rows = [
    [text(locale, '2024-03', '2024-03'), text(locale, '初始诊断', 'Initial diagnosis'), text(locale, '病理确认', 'Pathology confirmed')],
    [text(locale, '2024-04', '2024-04'), text(locale, '第 01 线', 'Line 01'), text(locale, '方案开始', 'Regimen started')],
    [text(locale, '2025-01', '2025-01'), text(locale, '疗效评估', 'Response review'), text(locale, '阶段记录', 'Phase recorded')],
  ]

  return (
    <article className={`h-full rounded-[22px] border p-5 md:p-7 ${skin.cardMuted}`} data-story-view-panel="table">
      <div className={`font-[var(--ff-font-mono)] text-[13px] font-bold tracking-[0.12em] ${skin.body}`}>TIMELINE TABLE</div>
      <h3 className={`mt-2 text-2xl font-semibold ${skin.heading}`}>{text(locale, '极简时间线表', 'Minimal timeline table')}</h3>
      <div className={`mt-7 overflow-hidden rounded-[18px] border ${skin.tableLine}`}>
        <div className={`grid grid-cols-[0.72fr_1fr_1.2fr] border-b px-4 py-3 text-[13px] font-extrabold tracking-normal ${skin.tableLine} ${skin.body}`}>
          <span>{text(locale, '日期', 'Date')}</span>
          <span>{text(locale, '事件', 'Event')}</span>
          <span>{text(locale, '摘要', 'Summary')}</span>
        </div>
        {rows.map((row) => (
          <div className={`grid grid-cols-[0.72fr_1fr_1.2fr] border-b px-4 py-4 text-sm last:border-b-0 ${skin.tableLine}`} key={row.join('-')}>
            <span className={`font-[var(--ff-font-mono)] ${skin.body}`}>{row[0]}</span>
            <span className={`font-extrabold ${skin.heading}`}>{row[1]}</span>
            <span className={`font-semibold ${skin.body}`}>{row[2]}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function GanttPreview({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]
  const bars = [
    { label: text(locale, '第 01 线', 'Line 01'), left: '4%', width: '54%' },
    { label: text(locale, '第 02 线', 'Line 02'), left: '42%', width: '38%' },
    { label: text(locale, '第 03 线', 'Line 03'), left: '71%', width: '25%' },
  ]

  return (
    <article className={`h-full rounded-[22px] border p-5 md:p-7 ${skin.cardMuted}`} data-story-view-panel="gantt">
      <div className={`font-[var(--ff-font-mono)] text-[13px] font-bold tracking-[0.12em] ${skin.body}`}>TREATMENT GANTT</div>
      <h3 className={`mt-2 text-2xl font-semibold ${skin.heading}`}>{text(locale, '治疗线 Gantt', 'Treatment-line Gantt')}</h3>
      <div className={`mt-7 rounded-[18px] border p-4 md:p-6 ${skin.tableLine}`}>
        <div className={`grid grid-cols-4 text-center font-[var(--ff-font-mono)] text-[13px] font-bold ${skin.body}`}>
          <span>2024 H1</span><span>2024 H2</span><span>2025 H1</span><span>2025 H2</span>
        </div>
        <div className="mt-6 space-y-5">
          {bars.map((bar, index) => (
            <div className="relative h-10" key={bar.label}>
              <div className={`absolute inset-x-0 top-1/2 h-px ${skin.line}`} />
              <div
                className={`absolute inset-y-1 flex items-center rounded-full px-4 text-xs font-extrabold ${index === 1 ? 'bg-[#5f9692] text-black' : 'bg-[var(--ff-accent-primary)] text-[var(--ff-accent-foreground)]'}`}
                style={{ left: bar.left, width: bar.width }}
              >
                {bar.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function ViewsSection({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]

  return (
    <section
      aria-labelledby="story-views-title"
      className={`story-section story-sticky-stage relative ${skin.viewsSection}`}
      data-story-chapter="views"
      id="story-views"
    >
      <div className="story-sticky-panel flex items-center overflow-hidden py-16" id="story-views-sticky">
        <div className="w-full" id="story-views-exit">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-7 md:px-14 lg:grid-cols-[0.62fr_1.38fr] lg:items-center" id="story-views-frame">
            <div>
              <StoryEyebrow index="04" label={text(locale, '三视图', 'Three views')} theme={theme} />
              <SectionHeading className="mt-7" id="story-views-title" theme={theme}>
                {text(locale, '同一份病历，\n三种阅读距离。', 'One record.\nThree reading distances.')}
              </SectionHeading>
              <p className={`mt-7 max-w-xl text-lg font-semibold leading-8 ${skin.body}`}>
                {text(locale, '档案用于完整阅读，时间线表便于核对日期，甘特图展示各阶段的治疗时长。三种视图共用同一份记录。', 'Read the full record, check dates in a timeline table, or compare treatment durations in a Gantt chart. All views share the same record.')}
              </p>
              <div className="mt-8 flex flex-wrap gap-2" aria-hidden="true">
                {['DOSSIER', 'TABLE', 'GANTT'].map((label) => (
                  <span className={`rounded-full border px-3 py-1.5 font-[var(--ff-font-mono)] text-[13px] font-bold tracking-[0.1em] ${skin.tableLine} ${skin.body}`} key={label}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className={`story-view-stack rounded-[30px] border p-3 md:p-4 ${skin.frame}`}>
              <DossierPreview locale={locale} theme={theme} />
              <TablePreview locale={locale} theme={theme} />
              <GanttPreview locale={locale} theme={theme} />
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="story-scroll-spacer" data-story-spacer="views" />
    </section>
  )
}

function LabsSection({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]
  const tableRows = [
    [text(locale, '血常规', 'Blood routine'), 'WBC', '4.8 → 5.1 → 4.9'],
    [text(locale, '血生化', 'Blood biochemistry'), 'ALT', '21 → 24 → 23'],
    [text(locale, '肿瘤标志物', 'Tumor markers'), 'CA15-3', '18 → 23 → 29'],
  ]

  return (
    <section
      aria-labelledby="story-labs-title"
      className={`story-section relative min-h-[112svh] overflow-hidden py-24 md:py-32 ${skin.labsSection}`}
      data-story-chapter="labs"
      id="story-labs"
    >
      <div className="mx-auto w-full max-w-7xl px-7 md:px-14">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <StoryEyebrow index="05" label={text(locale, '实验室趋势', 'Laboratory trends')} theme={theme} />
            <SectionHeading className="mt-7" id="story-labs-title" theme={theme}>
              {text(locale, '让变化可见，\n但不越过诊断边界。', 'Make change visible.\nDo not cross the diagnostic boundary.')}
            </SectionHeading>
          </div>
          <p className={`max-w-2xl text-lg font-semibold leading-8 lg:justify-self-end ${skin.body}`}>
            {text(locale, '按时间查看化验指标，用症状日志记录副作用，保存随访计划与结果。趋势和提醒用于复核变化，不代替医生判断。', 'Track lab results over time, record side effects and keep follow-up plans and results together. Trends help review changes; they do not replace clinical judgement.')}
          </p>
        </div>

        <div className="story-motion-target mt-14 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]" data-story-motion="labs-trend">
          <div className={`rounded-[28px] border p-5 md:p-8 ${skin.card}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className={`font-[var(--ff-font-mono)] text-[13px] font-bold tracking-[0.12em] ${skin.body}`}>CA15-3 / TREND</div>
                <div className={`mt-2 text-2xl font-semibold ${skin.heading}`}>{text(locale, '连续区间变化', 'Adjacent interval change')}</div>
              </div>
              <span className="rounded-full border border-[var(--ff-accent-warning)]/28 bg-[var(--ff-accent-warning)]/10 px-3 py-1.5 text-xs font-extrabold text-[var(--ff-accent-warning)]">
                +27.8% / +26.1%
              </span>
            </div>
            <div className={`relative mt-8 h-60 overflow-hidden rounded-[20px] border p-5 ${skin.cardMuted}`}>
              <div className="absolute inset-5 grid grid-rows-4">
                {[0, 1, 2, 3].map((line) => <span className={`border-t ${skin.tableLine}`} key={line} />)}
              </div>
              <svg aria-label={text(locale, 'CA15-3 三次测量趋势示意', 'Illustrative trend of three CA15-3 readings')} className="relative h-full w-full overflow-visible" role="img" viewBox="0 0 500 180">
                <polyline className="story-lab-line" fill="none" points="30,145 245,96 470,35" stroke="var(--ff-accent-primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
                {[['30', '145'], ['245', '96'], ['470', '35']].map(([cx, cy]) => (
                  <circle cx={cx} cy={cy} fill="var(--ff-accent-primary)" key={`${cx}-${cy}`} r="7" />
                ))}
              </svg>
              <div className={`absolute inset-x-6 bottom-4 flex justify-between font-[var(--ff-font-mono)] text-[13px] font-bold ${skin.body}`}>
                <span>T1 · 18</span><span>T2 · 23</span><span>T3 · 29</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className={`rounded-[28px] border p-5 md:p-6 ${skin.card}`}>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-[30px] text-[var(--ff-accent-warning)]" aria-hidden="true">trending_up</span>
                <div>
                  <h3 className={`text-xl font-semibold ${skin.heading}`}>{text(locale, '提醒规则', 'Reminder rule')}</h3>
                  <p className={`mt-3 text-sm font-semibold leading-7 ${skin.body}`}>
                    {text(locale, '仅当最近两个相邻区间都上涨超过 20% 时，形成肿瘤标志物上升提醒。', 'A tumor-marker rise reminder appears only when both of the latest adjacent intervals increase by more than 20%.')}
                  </p>
                </div>
              </div>
            </div>
            <div className={`rounded-[28px] border p-5 md:p-6 ${skin.card}`}>
              <div className={`font-[var(--ff-font-mono)] text-[13px] font-bold tracking-[0.12em] ${skin.body}`}>{text(locale, '等价数据表', 'EQUIVALENT DATA TABLE')}</div>
              <div className="mt-4 space-y-3">
                {tableRows.map((row) => (
                  <div className={`grid grid-cols-[1fr_0.55fr_1.25fr] gap-3 border-t pt-3 text-xs ${skin.tableLine}`} key={row[1]}>
                    <span className={`font-bold ${skin.heading}`}>{row[0]}</span>
                    <span className={`font-[var(--ff-font-mono)] ${skin.body}`}>{row[1]}</span>
                    <span className={`text-right font-[var(--ff-font-mono)] ${skin.body}`}>{row[2]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={`mt-8 border-l-2 border-[var(--ff-accent-primary)] pl-5 text-sm font-bold leading-7 ${skin.body}`}>
          {text(locale, '非诊断：趋势与提醒只辅助整理和复核，不输出诊断结论或治疗建议。', 'Non-diagnostic: trends and reminders support organization and review; they do not provide diagnoses or treatment recommendations.')}
        </p>
      </div>
    </section>
  )
}

function BoundarySection({ locale, theme }: { locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]
  const boundaries = [
    {
      icon: 'visibility_lock',
      title: text(locale, '只读且只限一份病历', 'Read-only, one record only'),
      copy: text(locale, '分享不授予整个账户、工作区或其他患者记录的访问权。', 'A share grants no access to the full account, workspace, or other patient records.'),
    },
    {
      icon: 'fingerprint',
      title: text(locale, '凭授权码查看', 'Access with an authorization code'),
      copy: text(locale, '把分享链接与授权码交给需要查看的人；接收者只能阅读，不能修改记录。', 'Give the link and authorization code to the intended reader. They can view that record without changing it.'),
    },
    {
      icon: 'event_busy',
      title: text(locale, '可撤销，可过期', 'Revocable and expirable'),
      copy: text(locale, '所有者可以撤销分享，过期后公开读取立即失效。', 'The owner can revoke a share, and public read access ends when it expires.'),
    },
  ]

  return (
    <section
      aria-labelledby="story-boundary-title"
      className={`story-section relative min-h-[102svh] overflow-hidden py-24 md:py-32 ${skin.section}`}
      data-story-chapter="boundary"
      id="story-boundary"
    >
      <div className={`story-layer-motion pointer-events-none absolute -right-[20vw] top-16 h-[70vw] w-[70vw] max-h-[54rem] max-w-[54rem] rounded-full blur-3xl ${skin.layerGlow}`} data-story-layer />
      <div className="relative mx-auto w-full max-w-7xl px-7 md:px-14">
        <div className="max-w-4xl">
          <StoryEyebrow index="06" label={text(locale, '隐私边界', 'Privacy boundary')} theme={theme} />
          <SectionHeading className="mt-7" id="story-boundary-title" theme={theme}>
            {text(locale, '分享一份记录，\n不是打开整个账户。', 'Share one record.\nDo not open the whole account.')}
          </SectionHeading>
          <p className={`mt-8 max-w-2xl text-lg font-semibold leading-8 ${skin.body}`}>
            {text(locale, '授权边界必须像时间线一样清楚：谁能读、能读什么、何时失效，都不能依赖含糊默认值。', 'Authorization boundaries must be as clear as the timeline: who can read, what they can read, and when access ends cannot depend on ambiguous defaults.')}
          </p>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {boundaries.map((boundary) => (
            <article className={`rounded-[28px] border p-6 md:p-7 ${skin.card}`} key={boundary.title}>
              <span className="material-symbols-outlined text-[34px] text-[var(--ff-accent-text)]" aria-hidden="true">{boundary.icon}</span>
              <h3 className={`mt-10 text-xl font-semibold ${skin.heading}`}>{boundary.title}</h3>
              <p className={`mt-4 text-sm font-semibold leading-7 ${skin.body}`}>{boundary.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClosingSection({ closingCta, locale, theme }: { closingCta: ReactNode; locale: Locale; theme: Theme }) {
  const skin = storyThemeSkins[theme]

  return (
    <section
      aria-labelledby="story-cta-title"
      className={`story-section relative flex min-h-[88svh] items-center overflow-hidden py-24 ${skin.problemSection}`}
      data-story-chapter="cta"
      id="story-cta"
    >
      <div className={`story-layer-motion pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${skin.layerGlow}`} data-story-layer />
      <div className="relative mx-auto w-full max-w-5xl px-7 text-center md:px-14">
        <StoryEyebrow index="07" label={text(locale, '开始', 'Begin')} theme={theme} />
        <SectionHeading className="mt-8" id="story-cta-title" theme={theme}>
          {text(locale, '把散落的治疗史，\n收回一条可追溯的线。', 'Bring scattered treatment history\nback into one traceable line.')}
        </SectionHeading>
        <p className={`mx-auto mt-8 max-w-2xl text-lg font-semibold leading-8 ${skin.body}`}>
          {text(locale, '从第一份病历开始，逐步补充治疗、指标、症状与随访，让每次就诊都能回看完整经过。', 'Start with one record and keep adding treatment, lab results, symptoms and follow-ups, so each appointment has a clear history.')}
        </p>
        <div className="mt-10 flex justify-center">{closingCta}</div>
        <div className={`mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 font-[var(--ff-font-mono)] text-[13px] font-bold tracking-normal ${skin.body}`}>
          <span>{text(locale, '非诊断', 'Non-diagnostic')}</span>
          <span aria-hidden="true">·</span>
          <span>{text(locale, '隐私优先', 'Privacy first')}</span>
          <span aria-hidden="true">·</span>
          <span>{text(locale, '可追溯', 'Traceable')}</span>
        </div>
      </div>
    </section>
  )
}

export function LoginStorySections({
  closingCta,
  locale,
  theme,
}: {
  closingCta: ReactNode
  locale: Locale
  theme: Theme
}) {
  return (
    <div id="story-layer-trigger">
      <ProblemSection locale={locale} theme={theme} />
      <IntakeSection locale={locale} theme={theme} />
      <TimelineSection locale={locale} theme={theme} />
      <ViewsSection locale={locale} theme={theme} />
      <LabsSection locale={locale} theme={theme} />
      <BoundarySection locale={locale} theme={theme} />
      <ClosingSection closingCta={closingCta} locale={locale} theme={theme} />
    </div>
  )
}
