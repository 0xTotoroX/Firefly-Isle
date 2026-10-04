/**
 * [INPUT]: 公共 PKCE 回调、当前认证身份、Supabase updateUser 与本地化反馈。
 * [OUTPUT]: ResetPasswordPage；本次链接成功换取会话后才允许设置密码，失败保留可重试表单。
 * [POS]: /auth/reset-password 公共入口；链接/账号 key 隔离表单与迟到提交，不用浏览器会话替代有效链接。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAsyncResource } from '@/lib/async-resource'
import { useAuth } from '@/lib/auth'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { getOnlineRequiredMessage, isBrowserOffline } from '@/lib/network-status'
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'
import { updateRecoveredPassword } from '@/lib/password-recovery'
import { restoreAuthCallbackSession, type AuthCallbackResult } from './auth-callback-page.logic'

const FIELD = 'mt-2 min-h-[44px] w-full rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] px-3 text-base'

export function ResetPasswordPage() {
  const { user } = useAuth()
  const location = useLocation()
  const href = `${location.pathname}${location.search}${location.hash}`
  return <ResetPasswordForm key={`${href}:${user?.id ?? ''}`} href={href} />
}

function ResetPasswordForm({ href }: { href: string }) {
  const { locale } = useLocale()
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const generation = useRef(0)
  const submitting = useRef(false)
  const resource = useAsyncResource(
    () => hasSupabaseEnv ? restoreAuthCallbackSession(getSupabaseClient().auth, href, { requireCode: true, locale }) : Promise.resolve<AuthCallbackResult>({ status: 'error', message: getCopy(copy.authFeedback.callbackMissingEnv, locale) }),
    [href, locale],
  )
  const session = resource.data?.status === 'authenticated' ? resource.data.session : null
  const identityMatches = session?.user.id === user?.id
  const linkError = resource.data?.status === 'error' ? resource.data.message : resource.error ? getCopy(copy.authFeedback.callbackUnavailable, locale) : null
  const feedback = (key: keyof typeof copy.authFeedback) => getCopy(copy.authFeedback[key], locale)

  useEffect(() => () => { generation.current += 1 }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !identityMatches || saved || submitting.current) return
    if (isBrowserOffline()) { setError(getOnlineRequiredMessage(locale)); return }
    if (password.length < 6) { setError(feedback('passwordTooShort')); return }
    if (password !== confirmation) { setError(feedback('passwordMismatch')); return }
    const request = generation.current
    submitting.current = true
    setSaving(true)
    setError(null)
    try {
      const auth = getSupabaseClient().auth
      const current = await auth.getSession()
      if (request !== generation.current) return
      if (current.error || current.data.session?.user.id !== session.user.id) {
        setError(feedback('resetLinkInvalid'))
        return
      }
      const { error: updateError } = await updateRecoveredPassword(session, password)
      if (request !== generation.current) return
      if (updateError) { setError(feedback('passwordSaveFailed')); return }
      setPassword('')
      setConfirmation('')
      setSaved(true)
    } catch {
      if (request === generation.current) setError(feedback('passwordSaveFailed'))
    } finally {
      if (request === generation.current) { submitting.current = false; setSaving(false) }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ff-surface-base)] px-5 py-12 text-[var(--ff-text-primary)]">
      <section aria-labelledby="reset-title" className="w-full max-w-md rounded-[var(--ff-radius-xl)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] p-6 sm:p-8">
        <h1 className="text-[28px] font-medium leading-[38px]" id="reset-title">{feedback('resetTitle')}</h1>
        {resource.isLoading ? <p className="mt-5" role="status">{feedback('callbackRestoring')}</p> : linkError || !session || !identityMatches ? <>
          <p className="mt-5 text-[var(--ff-critical)]" role="alert">{linkError ?? feedback('resetLinkInvalid')}</p>
          <Link className="mt-5 inline-flex min-h-[44px] items-center text-[var(--ff-accent-text)] underline" to="/login?mode=password-reset">{feedback('resetRequestAgain')}</Link>
        </> : saved ? <>
          <p className="mt-5" role="status">{feedback('passwordSaved')}</p>
          <Link className="mt-5 inline-flex min-h-[44px] items-center text-[var(--ff-accent-text)] underline" to="/dashboard">{feedback('continueToDashboard')}</Link>
        </> : <form className="mt-5 space-y-5" onSubmit={(event) => void submit(event)}>
          <p className="break-words">{feedback('resetEmail')}：{session.user.email}</p>
          <label className="block">{feedback('newPassword')}<input autoComplete="new-password" className={FIELD} disabled={saving} minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          <label className="block">{feedback('confirmPassword')}<input autoComplete="new-password" className={FIELD} disabled={saving} minLength={6} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></label>
          {error ? <p className="text-[var(--ff-critical)]" role="alert">{error}</p> : null}
          <button className="min-h-[44px] w-full rounded-[var(--ff-radius-md)] bg-[var(--ff-accent-primary)] px-4 font-medium text-[var(--ff-accent-foreground)] disabled:opacity-50" disabled={saving} type="submit">{feedback(saving ? 'passwordSaving' : 'passwordSave')}</button>
        </form>}
      </section>
    </main>
  )
}
