/**
 * [INPUT]: 依赖 react 的 disclosure 状态，依赖 @/lib/records/record-sharing 的 RecordShare 类型与 @/lib/locale 的 Locale。
 * [OUTPUT]: 对外提供 RecordSharePanel 组件和 RecordSharePanelState，以次级 disclosure 渲染创建、复制、查看、撤销、Demo 预览禁用态与过期/撤销状态。
 * [POS]: components/record 的分享管理展示层，由 record-page.tsx 注入真实分享状态或 Demo 预览状态和动作，不直接读取 Supabase；所有病历默认折叠，按需展开分享动作。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useState } from 'react'

import type { Locale } from '@/lib/locale'
import type { RecordShare } from '@/lib/records/record-sharing'

export type RecordSharePanelState = {
  createdUrl: string | null
  error: string | null
  isCreating: boolean
  isLoading: boolean
  revokingShareId: string | null
  shares: RecordShare[]
}

function getShareStatus(share: RecordShare, now = Date.now()) {
  if (share.revokedAt) {
    return 'revoked'
  }

  if (new Date(share.expiresAt).getTime() <= now) {
    return 'expired'
  }

  return 'active'
}

function formatDate(value: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function RecordSharePanel({
  defaultOpen = false,
  locale,
  onCopyCreatedUrl,
  onCreateShare,
  onRevokeShare,
  previewNotice,
  state,
}: {
  defaultOpen?: boolean
  locale: Locale
  onCopyCreatedUrl: () => void
  onCreateShare: () => void
  onRevokeShare: (shareId: string) => void
  previewNotice?: string
  state: RecordSharePanelState
}) {
  const [open, setOpen] = useState(defaultOpen)
  const copy =
    locale === 'zh'
      ? {
          active: '有效',
          collapse: '收起分享设置',
          copy: '复制链接',
          create: '创建 7 天只读分享',
          creating: '创建中...',
          hint: '只读、可撤销',
          empty: '链接只会显示一次，请及时复制，并仅发给需要查看的人。',
          expired: '已过期',
          expires: '过期时间',
          expand: '展开分享设置',
          linkReady: '分享链接已生成',
          loading: '读取分享中...',
          revoke: '撤销',
          revoked: '已撤销',
          title: '授权码分享',
          view: '查看分享',
        }
      : {
          active: 'Active',
          collapse: 'Hide sharing settings',
          copy: 'Copy link',
          create: 'Create 7-day read-only share',
          creating: 'Creating...',
          hint: 'Read-only, revocable',
          empty:
            'The link is shown once. Copy it now and share it only with intended readers.',
          expired: 'Expired',
          expires: 'Expires',
          expand: 'Show sharing settings',
          linkReady: 'Share link ready',
          loading: 'Loading shares...',
          revoke: 'Revoke',
          revoked: 'Revoked',
          title: 'Code Share',
          view: 'Open share',
        }

  return (
    <details
      className='group mb-7 border-y border-[var(--ff-border-muted)]'
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary className='t-control-press flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm [&::-webkit-details-marker]:hidden'>
        <span>
          <strong className='font-semibold text-[var(--ff-text-primary)]'>
            {copy.title}
          </strong>
          <span className='ml-3 hidden text-[var(--ff-text-muted)] sm:inline'>{copy.hint}</span>
        </span>
        <span className='shrink-0 text-xs font-semibold text-[var(--ff-text-secondary)]'>
          {open ? copy.collapse : copy.expand}
        </span>
      </summary>

      <div className='border-t border-[var(--ff-border-muted)] pb-5 pt-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
          <p className='max-w-2xl text-sm leading-7 text-[var(--ff-text-secondary)]'>
            {previewNotice ?? (state.shares.length === 0 ? copy.empty : '')}
          </p>
          <button
            className='t-control-press inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'
            disabled={state.isCreating || Boolean(previewNotice)}
            onClick={onCreateShare}
            type='button'
          >
            {state.isCreating ? copy.creating : copy.create}
          </button>
        </div>

        {state.error ? (
          <div
            className='mt-4 border-l-2 border-[var(--ff-accent-primary)] bg-[var(--ff-surface-warning)] px-4 py-3 text-sm font-semibold text-[var(--ff-accent-text)]'
            role='alert'
          >
            {state.error}
          </div>
        ) : null}

        {state.createdUrl ? (
          <div className='mt-5 border-t border-[var(--ff-border-muted)] pt-4'>
            <div className='text-sm font-semibold text-[var(--ff-accent-success)]'>
              {copy.linkReady}
            </div>
            <div className='mt-3 flex flex-col gap-3 md:flex-row md:items-center'>
              <input
                className='h-10 min-w-0 flex-1 rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 font-[var(--ff-font-mono)] text-xs text-[var(--ff-text-primary)]'
                aria-label={copy.linkReady}
                readOnly
                value={state.createdUrl}
              />
              <div className='flex gap-3 text-sm font-semibold'>
                <button
                  className='t-control-press border-b border-[var(--ff-border-default)] pb-0.5'
                  onClick={onCopyCreatedUrl}
                  type='button'
                >
                  {copy.copy}
                </button>
                <a
                  className='t-control-press border-b border-[var(--ff-border-default)] pb-0.5'
                  href={state.createdUrl}
                >
                  {copy.view}
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div className='mt-4'>
          {state.isLoading ? (
            <p className='text-sm text-[var(--ff-text-muted)]'>
              {copy.loading}
            </p>
          ) : null}
          {state.shares.map((share) => {
            const status = getShareStatus(share)
            const statusText =
              status === 'revoked'
                ? copy.revoked
                : status === 'expired'
                  ? copy.expired
                  : copy.active

            return (
              <div
                className='flex flex-col gap-3 border-t border-[var(--ff-border-muted)] py-4 md:flex-row md:items-center md:justify-between'
                key={share.id}
              >
                <div className='text-sm'>
                  <span
                    className={
                      status === 'active'
                        ? 'font-semibold text-[var(--ff-accent-success)]'
                        : 'font-semibold text-[var(--ff-text-muted)]'
                    }
                  >
                    {statusText}
                  </span>
                  <span className='ml-3 text-[var(--ff-text-secondary)]'>
                    {copy.expires}: {formatDate(share.expiresAt, locale)}
                  </span>
                </div>
                <button
                  className='t-control-press w-fit border-b border-[var(--ff-border-default)] pb-0.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={
                    Boolean(previewNotice) ||
                    status !== 'active' ||
                    state.revokingShareId === share.id
                  }
                  onClick={() => onRevokeShare(share.id)}
                  type='button'
                >
                  {copy.revoke}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </details>
  )
}
