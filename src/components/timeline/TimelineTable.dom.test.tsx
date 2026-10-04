// @vitest-environment happy-dom
/**
 * [INPUT]: React testing-library、Vitest、LocaleProvider 与 TimelineTable；仅用合成病历。
 * [OUTPUT]: 编辑取消后重试、多行字段、跨病历隔离和只读界面的交互回归。
 * [POS]: timeline 的真实 DOM 行为测试，验证字段保存事件，不依赖源码布局。
 * [PROTOCOL]: 编辑行为或分区职责变化时同步此测试及所属 AGENTS.md。
 */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/lib/locale'
import type { PatientRecord } from '@/types/patient'

import { TimelineTable } from './TimelineTable'

const record: PatientRecord = {
  id: 'fictional-a',
  basicInfo: { age: 55, tumorType: '示例癌种', stage: '示例分期' },
  treatmentLines: [{ lineNumber: 1, regimen: '示例治疗方案' }],
}

function table(value: PatientRecord, onCommitField?: (target: unknown, value: string) => void) {
  return <LocaleProvider persist={false}><TimelineTable onCommitField={onCommitField} record={value} theme="light" /></LocaleProvider>
}

describe('TimelineTable field editing', () => {
  it('saves the next edit after Escape unmounts the previous input before blur', () => {
    const onCommit = vi.fn()
    render(table(record, onCommit))
    fireEvent.click(screen.getByRole('button', { name: /年龄/ }))
    const canceledInput = screen.getByRole('textbox', { name: '年龄' })
    fireEvent.change(canceledInput, { target: { value: '60' } })
    fireEvent.keyDown(canceledInput, { key: 'Escape' })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(onCommit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /年龄/ }))
    const input = screen.getByRole('textbox', { name: '年龄' })
    fireEvent.change(input, { target: { value: '61' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ field: 'age', section: 'basicInfo' }, '61')
  })

  it('uses a multiline editor and preserves treatment text and line-specific save target', () => {
    const onCommit = vi.fn()
    render(table(record, onCommit))
    fireEvent.click(screen.getByRole('button', { name: /示例治疗方案/ }))
    const input = screen.getByRole('textbox')
    expect(input.tagName).toBe('TEXTAREA')
    const text = '示例治疗方案第一行\n补充用药及复查备注第二行'
    fireEvent.change(input, { target: { value: text } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ field: 'regimen', lineNumber: 1, section: 'treatmentLine' }, text)
  })

  it('drops an unfinished edit when navigating to a different record', () => {
    const onCommit = vi.fn()
    const view = render(table(record, onCommit))
    fireEvent.click(screen.getByRole('button', { name: /年龄/ }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '99' } })
    view.rerender(table({ ...record, id: 'fictional-b', basicInfo: { age: 40 } }, onCommit))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /年龄：40/ })).toBeInTheDocument()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('renders an existing save callback as plain text while page editing is disabled', () => {
    render(<LocaleProvider persist={false}><TimelineTable disabled onCommitField={vi.fn()} record={record} theme="light" /></LocaleProvider>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('示例治疗方案')).toBeInTheDocument()
  })

  it('renders read-only values as text and makes missing critical fields explicit', () => {
    render(table({ treatmentLines: [] }))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getAllByText('未填写').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: '基本信息' })).toBeInTheDocument()
  })
})
