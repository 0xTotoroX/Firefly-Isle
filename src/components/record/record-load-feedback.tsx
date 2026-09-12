/**
 * [INPUT]: 加载/失败状态、重试动作与当前 locale。
 * [OUTPUT]: 病历辅助页面共用的加载和失败恢复提示。
 * [POS]: 区分读取失败与无记录，避免页面在未知病历上继续写入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'

export function RecordLoadFeedback({ isLoading, message, onRetry }: { isLoading: boolean; message: string; onRetry: () => void }) {
  const { locale } = useLocale()
  return (
    <div className="my-6 rounded-[var(--ff-radius-lg)] bg-[var(--ff-surface-inset)] p-6" role={isLoading ? 'status' : 'alert'}>
      <p className="text-sm leading-6 text-[var(--ff-text-secondary)]">{isLoading ? getCopy(copy.clinicalWorkflow.loading, locale) : message}</p>
      {!isLoading ? (
        <button className="t-control-press mt-3 min-h-[44px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold" onClick={onRetry} type="button">
          {getCopy(copy.clinicalWorkflow.retry, locale)}
        </button>
      ) : null}
    </div>
  )
}
