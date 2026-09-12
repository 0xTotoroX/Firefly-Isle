/**
 * [INPUT]: 当前 patientId、页面类型、双语 copy 与 React Router Link。
 * [OUTPUT]: 病历/指标/症状/随访的上下文导航。
 * [POS]: 当前病历的共享入口，不提供 Demo 到真实患者的隐式跳转。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Link } from 'react-router-dom'
import { copy, getCopy } from '@/lib/copy'
import type { Locale } from '@/lib/locale'

type RecordSection = 'record' | 'labs' | 'symptoms' | 'followUp'

export function ClinicalRecordNav({ active, locale, patientId }: { active: RecordSection; locale: Locale; patientId: string }) {
  const items = [
    { key: 'record', href: `/record/${patientId}` },
    { key: 'labs', href: `/analytics/${patientId}` },
    { key: 'symptoms', href: `/record/${patientId}/side-effects`, testId: 'record-side-effects-link' },
    { key: 'followUp', href: `/record/${patientId}/follow-up`, testId: 'record-follow-up-link' },
  ] as const

  return (
    <nav aria-label={getCopy(copy.clinicalWorkflow.navigation, locale)} className="my-5 flex flex-wrap gap-1 border-b border-[var(--ff-border-default)] pb-2">
      {items.map((item) => (
        <Link
          aria-current={item.key === active ? 'page' : undefined}
          className="t-control-press inline-flex min-h-[44px] items-center rounded-[var(--ff-radius-md)] px-4 text-sm font-semibold text-[var(--ff-text-secondary)] hover:bg-[var(--ff-surface-inset)] aria-[current=page]:bg-[var(--ff-accent-soft)] aria-[current=page]:text-[var(--ff-accent-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ff-accent-text)]"
          data-testid={'testId' in item ? item.testId : undefined}
          key={item.key}
          to={item.href}
        >
          {getCopy(copy.clinicalWorkflow[item.key], locale)}
        </Link>
      ))}
    </nav>
  )
}
