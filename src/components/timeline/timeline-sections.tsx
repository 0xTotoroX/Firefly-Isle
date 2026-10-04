/**
 * [INPUT]: Locale/copy、PatientRecord 分区类型、TimelineCell 与格式辅助。
 * [OUTPUT]: 提供 BasicInfoBlock、InitialOnsetBlock、TreatmentLineBlock，保留既有共享编辑 props 和字段目标。
 * [POS]: timeline 的分区与字段映射；各治疗阶段独立展开，清楚标题取代装饰编号，基因/免疫内容保留阶段归属。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；结构变化时同步所属 AGENTS.md。
 */
import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import type { BasicInfo, InitialOnset, TreatmentLine } from '@/types/patient'

import { TimelineCell, type SharedBlockProps, type TimelineField } from './timeline-cell'
import { display, formatMetric, formatPeriod, getEditValue } from './timeline-format'

const sectionClass = 'min-w-0 space-y-5 rounded-[var(--ff-radius-md)] border border-[var(--ff-timeline-section-border)] bg-[var(--ff-timeline-section-bg)] p-4 sm:p-6'

function SectionHeader({ badge, title }: { badge?: string; title: string }) {
  return (
    <header className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
      <h2 className="font-[var(--ff-font-display)] text-xl font-bold leading-8 text-[var(--ff-timeline-text-strong)] sm:text-2xl">{title}</h2>
      {badge ? <p className="text-sm leading-6 text-[var(--ff-timeline-label)] [overflow-wrap:anywhere]">{badge}</p> : null}
    </header>
  )
}

function FieldGrid({ fields, shared, className = 'grid gap-3 sm:grid-cols-2' }: {
  fields: TimelineField[]
  shared: SharedBlockProps
  className?: string
}) {
  return (
    <div className={className}>
      {fields.map((field) => <TimelineCell key={field.cellId} {...shared} {...field} />)}
    </div>
  )
}

export function BasicInfoBlock({ basicInfo, ...shared }: SharedBlockProps & { basicInfo?: BasicInfo }) {
  const { locale } = useLocale()
  const labels = copy.timeline
  const field = (name: keyof BasicInfo, label: string, value = display(basicInfo?.[name]), critical = false): TimelineField => ({
    cellId: `basicInfo.${name}`, critical, editValue: getEditValue(basicInfo?.[name]), label,
    target: { field: name, section: 'basicInfo' }, value,
  })
  const fields = [
    field('gender', getCopy(labels.gender, locale)),
    field('age', getCopy(labels.age, locale), formatMetric(basicInfo?.age, '岁', locale)),
    field('height', getCopy(labels.height, locale), formatMetric(basicInfo?.height, 'cm', locale)),
    field('weight', getCopy(labels.weight, locale), formatMetric(basicInfo?.weight, 'kg', locale)),
    field('tumorType', getCopy(labels.tumorType, locale), display(basicInfo?.tumorType), true),
    field('diagnosisDate', getCopy(labels.diagnosisDate, locale)),
    field('stage', getCopy(labels.stage, locale), display(basicInfo?.stage), true),
  ]

  return (
    <section className={sectionClass}>
      <SectionHeader title={getCopy(labels.basicInfoTitle, locale)} />
      {!display(basicInfo?.tumorType) || !display(basicInfo?.stage) ? (
        <p className="text-sm leading-6 text-[var(--ff-timeline-accent)]">{getCopy(labels.criticalFields, locale)}</p>
      ) : null}
      <FieldGrid className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" fields={fields} shared={shared} />
    </section>
  )
}

export function InitialOnsetBlock({ initialOnset, ...props }: SharedBlockProps & { initialOnset: InitialOnset; order: number }) {
  const { locale } = useLocale()
  const labels = copy.timeline
  const field = (name: keyof InitialOnset, label: string, multiline = true, critical = false): TimelineField => ({
    cellId: `initialOnset.${name}`, critical, editValue: getEditValue(initialOnset[name]), label, multiline,
    target: { field: name, section: 'initialOnset' }, value: display(initialOnset[name]),
  })

  return (
    <article className={sectionClass}>
      <SectionHeader badge={display(initialOnset.triggerDate)} title={getCopy(labels.initialOnsetTitle, locale)} />
      <FieldGrid fields={[
        field('treatment', getCopy(labels.regimen, locale), true, true),
        field('triggerDate', getCopy(labels.triggerDate, locale), false),
        field('immunohistochemistry', getCopy(labels.immunohistochemistry, locale)),
        field('geneticTest', getCopy(labels.genetic, locale)),
      ]} shared={props} />
    </article>
  )
}

export function TreatmentLineBlock({ line, ...props }: SharedBlockProps & { line: TreatmentLine; order: number }) {
  const { locale } = useLocale()
  const labels = copy.timeline
  const field = (name: Exclude<keyof TreatmentLine, 'lineNumber'>, label: string, multiline = true, critical = false): TimelineField => ({
    cellId: `treatmentLine.${line.lineNumber}.${name}`, critical, editValue: getEditValue(line[name]), label, multiline,
    target: { field: name, lineNumber: line.lineNumber, section: 'treatmentLine' }, value: display(line[name]),
  })

  return (
    <article className={sectionClass}>
      <SectionHeader badge={formatPeriod(line.startDate, line.endDate, locale)} title={`${getCopy(labels.treatmentLine, locale)} ${line.lineNumber}`} />
      <TimelineCell {...props} {...field('regimen', getCopy(labels.regimen, locale), true, true)} />
      <FieldGrid fields={[
        field('startDate', getCopy(labels.startDate, locale), false),
        field('endDate', getCopy(labels.endDate, locale), false),
      ]} shared={props} />
      <FieldGrid fields={[
        field('biopsy', getCopy(labels.biopsy, locale)),
        field('immunohistochemistry', getCopy(labels.immunohistochemistry, locale)),
        field('geneticTest', getCopy(labels.genetic, locale)),
      ]} shared={props} />
    </article>
  )
}
