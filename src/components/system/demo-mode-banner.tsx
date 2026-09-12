/**
 * [INPUT]: 依赖 react-router-dom 的 Link、@/lib/locale 的当前语言状态。
 * [OUTPUT]: 对外提供 DemoModeBanner 组件，以低干扰说明行渲染公开 Demo 模式和返回登录入口。
 * [POS]: components/system 的页面级 Demo disclosure，被 /demo/record 与 /demo/analytics 复用，说明公开演示数据不写入个人账号但不压过页面正文。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Link } from 'react-router-dom'

import { useLocale } from '@/lib/locale'

export function DemoModeBanner() {
  const { locale } = useLocale()
  const copy =
    locale === 'zh'
      ? {
          action: '登录或新建自己的工作区',
          body: '这里展示公开演示数据；编辑只用于当前页面调试，不会写入你的个人账号。新注册或匿名账号默认从空白工作区开始。',
          label: '演示数据',
          title: '当前为 Demo 视图',
        }
      : {
          action: 'Log in or create your own workspace',
          body: 'This page shows public demo data. Edits are only for page debugging and are not written to your personal account. New accounts and anonymous sessions start blank.',
          label: 'Demo data',
          title: 'You are viewing Demo mode',
        }

  return (
    <section
      aria-label={copy.title}
      className='mb-6 border-y border-[var(--ff-border-muted)] py-3 text-[var(--ff-text-primary)]'
      data-testid='demo-mode-banner'
    >
      <div className='flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4'>
        <span className='w-fit shrink-0 text-xs font-bold text-[var(--ff-accent-text)]'>
          {copy.label}
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold'>{copy.title}</p>
          <p className='mt-1 text-sm leading-6 text-[var(--ff-text-secondary)]'>
            {copy.body}
          </p>
        </div>
        <Link
          className='t-control-press w-fit shrink-0 border-b border-[var(--ff-border-default)] pb-0.5 text-sm font-semibold text-[var(--ff-text-secondary)] hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)]'
          to='/login'
        >
          {copy.action}
        </Link>
      </div>
    </section>
  )
}
