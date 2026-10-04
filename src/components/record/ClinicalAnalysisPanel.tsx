/**
 * [INPUT]: 依赖 @/lib/clinical-analysis 的 ClinicalAnalysisResult，依赖 @/lib/locale 的 Locale。
 * [OUTPUT]: 对外提供 ClinicalAnalysisPanel 组件，以平面章节渲染 AI 辅助分析入口、加载态、失败态、结果分区与非诊断免责声明。
 * [POS]: components/record 的 AI 分析展示层，由 record-page.view 注入状态和动作，不直接调用 LLM 或读取 Supabase；保留真实能力边界但不使用认证式 AI 装饰。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { ClinicalAnalysisResult } from '@/lib/clinical-analysis'
import type { Locale } from '@/lib/locale'

export type ClinicalAnalysisPanelState = {
  error: string | null
  isLoading: boolean
  result: ClinicalAnalysisResult | null
}

function AnalysisList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className='text-sm leading-7 text-[var(--ff-text-muted)]'>
        暂无可展示内容
      </p>
    )
  }

  return (
    <ul className='space-y-2 text-sm leading-7 text-[var(--ff-text-secondary)]'>
      {items.map((item) => (
        <li className='flex gap-3' key={item}>
          <span
            aria-hidden='true'
            className='mt-[0.72rem] h-1 w-1 shrink-0 rounded-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)]'
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function AnalysisBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <section className='border-t border-[var(--ff-border-muted)] pt-4'>
      <h4 className='mb-3 text-sm font-semibold text-[var(--ff-text-primary)]'>
        {title}
      </h4>
      <AnalysisList items={items} />
    </section>
  )
}

export function ClinicalAnalysisPanel({
  disabled,
  locale,
  onAnalyze,
  state,
}: {
  disabled?: boolean
  locale: Locale
  onAnalyze?: () => void
  state: ClinicalAnalysisPanelState
}) {
  const copy =
    locale === 'zh'
      ? {
          action: '生成辅助分析',
          attention: '复核关注点',
          disclaimerFallback:
            '仅作病历整理和随访沟通参考，不构成诊断、疾病进展判断、用药建议或治疗指令。',
          followUp: '就诊前可补充问题',
          lab: '指标趋势摘要',
          loading: '分析中...',
          title: 'AI 辅助分析',
          treatment: '治疗线摘要',
          unavailable:
            'Demo 显示静态示例分析，不调用真实 LLM；请在自己的病历中生成实时分析。',
        }
      : {
          action: 'Generate analysis',
          attention: 'Review focus',
          disclaimerFallback:
            'For record organization and follow-up communication only. Not diagnosis or treatment advice.',
          followUp: 'Questions to prepare',
          lab: 'Lab trend summary',
          loading: 'Analyzing...',
          title: 'AI assisted analysis',
          treatment: 'Treatment summary',
          unavailable:
            'Demo shows a static sample and does not call the live LLM. Generate live analysis from your own record.',
        }
  const result = state.result

  return (
    <section className='mt-10 border-t border-[var(--ff-border-default)] pt-7'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='max-w-3xl'>
          <h3 className='text-xl font-semibold'>{copy.title}</h3>
          <p className='mt-2 text-sm leading-7 text-[var(--ff-text-secondary)]'>
            {result?.disclaimer ?? copy.disclaimerFallback}
          </p>
        </div>
        <button
          className='t-control-press w-fit border-b border-[var(--ff-border-default)] pb-0.5 text-sm font-semibold text-[var(--ff-text-secondary)] hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-text-primary)] disabled:cursor-not-allowed disabled:opacity-50'
          data-html2canvas-ignore
          disabled={disabled || state.isLoading || !onAnalyze}
          onClick={onAnalyze}
          type='button'
        >
          {state.isLoading ? copy.loading : copy.action}
        </button>
      </div>

      {!onAnalyze ? (
        <p className='mt-4 border-l-2 border-[var(--ff-border-default)] pl-4 text-sm leading-7 text-[var(--ff-text-secondary)]'>
          {copy.unavailable}
        </p>
      ) : null}

      {state.error ? (
        <div
          className='mt-4 border-l-2 border-[var(--ff-accent-primary)] bg-[var(--ff-surface-warning)] px-4 py-3 text-sm font-semibold text-[var(--ff-accent-text)]'
          role='alert'
        >
          {state.error}
        </div>
      ) : null}

      {result ? (
        <div className='mt-6 grid gap-x-8 gap-y-6 lg:grid-cols-2'>
          <AnalysisBlock
            items={result.treatmentSummary}
            title={copy.treatment}
          />
          <AnalysisBlock items={result.labTrendSummary} title={copy.lab} />
          <AnalysisBlock
            items={result.attentionPoints}
            title={copy.attention}
          />
          <AnalysisBlock
            items={result.followUpQuestions}
            title={copy.followUp}
          />
        </div>
      ) : null}
    </section>
  )
}
