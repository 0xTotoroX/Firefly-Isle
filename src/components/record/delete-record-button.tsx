/**
 * [INPUT]: Radix AlertDialog、删除动作与双语 copy。
 * [OUTPUT]: 有明确确认、焦点管理、请求锁和原位错误的删除按钮。
 * [POS]: 症状/随访条目的共用删除交互，只有确认后才调用存储。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { AlertDialog } from 'radix-ui'
import { useState } from 'react'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'

export function DeleteRecordButton({ disabled, onDelete, testId }: { disabled?: boolean; onDelete: () => Promise<void>; testId: string }) {
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirmDelete() {
    if (pending) return
    setPending(true)
    setFailed(false)
    try {
      await onDelete()
      setOpen(false)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog.Root onOpenChange={(next) => { if (!pending) { setOpen(next); setFailed(false) } }} open={open}>
      <AlertDialog.Trigger asChild>
        <button className="t-control-press min-h-[44px] rounded-[var(--ff-radius-md)] px-3 text-sm font-semibold text-[var(--ff-text-secondary)] hover:text-[var(--ff-critical)]" data-testid={testId} disabled={disabled} type="button">
          {getCopy(copy.followUp.deleteButton, locale)}
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[80] bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--ff-radius-lg)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-6 text-[var(--ff-text-primary)] shadow-xl">
          <AlertDialog.Title className="text-lg font-bold">{getCopy(copy.clinicalWorkflow.deleteTitle, locale)}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--ff-text-secondary)]">{getCopy(copy.clinicalWorkflow.deleteDescription, locale)}</AlertDialog.Description>
          {failed ? <p className="mt-3 text-sm text-[var(--ff-critical)]" role="alert">{getCopy(copy.followUp.deleteFailedFeedback, locale)}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel className="min-h-[44px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold" disabled={pending}>
              {getCopy(copy.followUp.cancelButton, locale)}
            </AlertDialog.Cancel>
            <button className="min-h-[44px] rounded-[var(--ff-radius-md)] bg-[var(--ff-danger-solid)] px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={() => void confirmDelete()} type="button">
              {getCopy(pending ? copy.clinicalWorkflow.deleting : copy.clinicalWorkflow.deleteConfirm, locale)}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
