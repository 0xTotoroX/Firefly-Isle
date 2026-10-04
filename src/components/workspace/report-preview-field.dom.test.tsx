/** @vitest-environment happy-dom */
/**
 * [INPUT]: React DOM 测试、LocaleProvider 和独立字段编辑组件；仅使用合成文本。
 * [OUTPUT]: 具名编辑输入、多行提交、取消与编辑中锁定回归。
 * [POS]: 工作台预览字段的可访问性与写入互斥检查。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部与所属 AGENTS.md。
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/lib/locale'
import { EditableCell } from './report-preview-field'

const target = { field: 'clinicalNotes', section: 'record' } as const
const initialNote = '合成备注第一行\n合成备注第二行'

function field(onCommitField = vi.fn(), disabled = false) {
  return (
    <LocaleProvider persist={false}>
      <EditableCell disabled={disabled} label="临床备注" multiline onCommitField={onCommitField} target={target} value={initialNote} />
    </LocaleProvider>
  )
}

describe('preview field editing', () => {
  it('associates the label with the multiline input and saves the complete text', () => {
    const onCommit = vi.fn()
    render(field(onCommit))
    fireEvent.click(screen.getByRole('button', { name: /临床备注/ }))
    const input = screen.getByRole('textbox', { name: '临床备注' }) as HTMLTextAreaElement
    expect(input.value).toBe(initialNote)
    expect(input.labels?.[0]?.textContent).toBe('临床备注')
    const revised = `${initialNote}\n${'很长的合成备注。'.repeat(40)}`
    fireEvent.change(input, { target: { value: revised } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(target, revised)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('does not write a cancelled draft and reopens the current record value', () => {
    const onCommit = vi.fn()
    render(field(onCommit))
    fireEvent.click(screen.getByRole('button', { name: /临床备注/ }))
    fireEvent.change(screen.getByRole('textbox', { name: '临床备注' }), { target: { value: '未保存的合成修改' } })
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /临床备注/ }))
    expect((screen.getByRole('textbox', { name: '临床备注' }) as HTMLTextAreaElement).value).toBe(initialNote)
  })

  it('blocks a form already open when extraction or saving locks editing', () => {
    const onCommit = vi.fn()
    const view = render(field(onCommit))
    fireEvent.click(screen.getByRole('button', { name: /临床备注/ }))
    fireEvent.change(screen.getByRole('textbox', { name: '临床备注' }), { target: { value: '等待解锁的草稿' } })
    view.rerender(field(onCommit, true))
    const input = screen.getByRole('textbox', { name: '临床备注' }) as HTMLTextAreaElement
    expect(input.disabled).toBe(true)
    expect((screen.getByRole('button', { name: '保存' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.submit(input.form!)
    expect(onCommit).not.toHaveBeenCalled()
    view.rerender(field(onCommit, false))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(target, '等待解锁的草稿')
  })
})
