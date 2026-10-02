/**
 * [INPUT]: React/Router、共享页面、账户认证 Provider、Demo 内存会话、主题/语言/背景音和隐私门控。
 * [OUTPUT]: App，提供公开演示和认证账户的独立运行边界。
 * [POS]: 路由装配入口；Demo 不挂载认证，使用会话内偏好，真实页面保持原认证/隐私/错误护栏。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { lazy, Suspense, type ReactNode, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams, Link } from 'react-router-dom'

import { PrivacyGate } from '@/components/privacy-gate'
import { ErrorBoundary } from '@/components/error-boundary'
import { NetworkStatusBanner } from '@/components/system/network-status-banner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { DemoSessionProvider, useDemoSession } from '@/lib/demo-session'
import { DEMO_DEFAULT_PATIENT_ID } from '@/lib/demo-fixtures'
import { BackgroundAudioProvider } from '@/lib/background-audio'
import { getCopy, copy } from '@/lib/copy'
import { LocaleProvider, useLocale } from '@/lib/locale'
import { PRIVACY_PAGE_HREF } from '@/lib/privacy'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { getOAuthCallbackErrorMessage } from '@/routes/auth-callback-page.logic'

const DonatePage = lazy(() => import('@/routes/donate-page').then((module) => ({ default: module.DonatePage })))
const DashboardPage = lazy(() => import('@/routes/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const ResetPasswordPage = lazy(() => import('@/routes/reset-password-page').then((module) => ({ default: module.ResetPasswordPage })))
const AuthCallbackPage = lazy(() => import('@/routes/auth-callback-page').then((module) => ({ default: module.AuthCallbackPage })))
const FollowUpPage = lazy(() => import('@/routes/follow-up-page').then((module) => ({ default: module.FollowUpPage })))
const LoginPage = lazy(() => import('@/routes/login-page').then((module) => ({ default: module.LoginPage })))
const ModelsPage = lazy(() => import('@/routes/models-page').then((module) => ({ default: module.ModelsPage })))
const LabAnalyticsPage = lazy(() => import('@/routes/lab-analytics-page').then((module) => ({ default: module.LabAnalyticsPage })))
const PrivacyPage = lazy(() => import('@/routes/privacy-page').then((module) => ({ default: module.PrivacyPage })))
const RecordPage = lazy(() => import('@/routes/record-page').then((module) => ({ default: module.RecordPage })))
const SettingsPage = lazy(() => import('@/routes/settings-page').then((module) => ({ default: module.SettingsPage })))
const SideEffectsPage = lazy(() => import('@/routes/side-effects-page').then((module) => ({ default: module.SideEffectsPage })))
const SharedRecordPage = lazy(() => import('@/routes/shared-record-page').then((module) => ({ default: module.SharedRecordPage })))
const WorkspacePage = lazy(() => import('@/routes/workspace-page').then((module) => ({ default: module.WorkspacePage })))

function AppBootScreen() {
  const { locale } = useLocale()
  const { theme } = useTheme()

  return theme === 'dark' ? (
    <div className="flex min-h-screen items-center justify-center bg-[var(--ff-surface-base)] px-6 text-[var(--ff-text-primary)]">
      <div className="border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-8 py-6 text-center">
        <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.4em] text-[var(--ff-accent-text)]">
          {getCopy(copy.app.boot.status, locale)}
        </div>
        <div className="mt-3 font-[var(--ff-font-display)] text-2xl font-black tracking-tight">{getCopy(copy.app.boot.title, locale)}</div>
      </div>
    </div>
  ) : (
    <div className="flex min-h-screen items-center justify-center bg-[var(--ff-surface-base)] px-6 text-[var(--ff-text-primary)]">
      <div className="ff-light-ink-shadow border-2 border-[var(--ff-border-default)] bg-[var(--ff-surface-paper)] px-8 py-6 text-center">
        <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.4em] text-[var(--ff-text-muted)]">
          {getCopy(copy.app.boot.status, locale)}
        </div>
        <div className="mt-3 font-[var(--ff-font-display)] text-3xl font-black tracking-tight">{getCopy(copy.app.boot.title, locale)}</div>
      </div>
    </div>
  )
}

function getUserLabel(locale: 'zh' | 'en', isAnonymous: boolean, email?: string | null) {
  if (isAnonymous) {
    return getCopy(copy.app.userLabel.anonymous, locale)
  }

  return email ?? getCopy(copy.app.userLabel.authenticated, locale)
}

function AppProviders({ children, persist = true }: { children: ReactNode; persist?: boolean }) {
  return (
    <ThemeProvider persist={persist}>
      <LocaleProvider persist={persist}>
        <BackgroundAudioProvider persist={persist}>
          <NetworkStatusBanner />
          {children}
        </BackgroundAudioProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}

function AppContent() {
  const { pathname } = useLocation()
  const isDemo = pathname === '/demo' || pathname.startsWith('/demo/') || pathname === '/record/demo' || pathname === '/analytics/demo'
  return (
    <AppProviders key={isDemo ? 'demo' : 'account'} persist={!isDemo}>
      {isDemo ? <DemoSessionProvider><DemoRoutes /></DemoSessionProvider> : (
        <AuthProvider><RouteErrorBoundary><PrivacyGate><AppRoutes /></PrivacyGate></RouteErrorBoundary></AuthProvider>
      )}
    </AppProviders>
  )
}

function DemoRoutes() {
  const demo = useDemoSession()!
  const identity = { userLabel: '演示账号', userIsAnonymous: true }
  return <RouteErrorBoundary key={demo.state.resetVersion}><Suspense fallback={<AppBootScreen />}><Routes>
    <Route path="/record/demo" element={<Navigate replace to={`/demo/record/${DEMO_DEFAULT_PATIENT_ID}`} />} />
    <Route path="/analytics/demo" element={<Navigate replace to={`/demo/analytics/${DEMO_DEFAULT_PATIENT_ID}`} />} />
    <Route path="/demo" element={<Navigate replace to="/demo/dashboard" />} />
    <Route path="/demo/dashboard" element={<DashboardPage {...identity} />} />
    <Route path="/demo/app" element={<WorkspacePage {...identity} />} />
    <Route path="/demo/record" element={<Navigate replace to={`/demo/record/${DEMO_DEFAULT_PATIENT_ID}`} />} />
    <Route path="/demo/analytics" element={<Navigate replace to={`/demo/analytics/${DEMO_DEFAULT_PATIENT_ID}`} />} />
    <Route path="/demo/record/:id" element={<DemoPatientBoundary><RecordPage {...identity} /></DemoPatientBoundary>} />
    <Route path="/demo/analytics/:id" element={<DemoPatientBoundary><LabAnalyticsPage {...identity} /></DemoPatientBoundary>} />
    <Route path="/demo/record/:id/side-effects" element={<DemoPatientBoundary><SideEffectsPage {...identity} /></DemoPatientBoundary>} />
    <Route path="/demo/record/:id/follow-up" element={<DemoPatientBoundary><FollowUpPage {...identity} /></DemoPatientBoundary>} />
    <Route path="/demo/settings" element={<SettingsPage {...identity} />} />
    <Route path="/demo/models" element={<ModelsPage {...identity} />} />
    <Route path="/demo/*" element={<Navigate replace to="/demo/dashboard" />} />
  </Routes></Suspense></RouteErrorBoundary>
}

function DemoPatientBoundary({ children }: { children: ReactNode }) {
  const { id } = useParams()
  const demo = useDemoSession()!
  if (demo.state.records.some((record) => record.id === id)) return children
  return <main className="mx-auto max-w-3xl px-5 py-10 text-[var(--ff-text-primary)]"><DemoModeBanner /><h1 className="text-2xl font-bold">没有找到这份演示病历</h1><Link className="mt-6 inline-flex min-h-[44px] items-center font-semibold text-[var(--ff-accent-text)]" to="/demo/dashboard">返回总览选择病历</Link></main>
}

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()

  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
}

function AppRoutes() {
  const { authError, isAuthenticated, isAuthReady, isSigningOut, signOut, user } = useAuth()
  const { locale } = useLocale()
  const location = useLocation()
  const oauthRedirectError = getOAuthCallbackErrorMessage(`${location.search}${location.hash}`, locale)
  const loginError = oauthRedirectError ?? authError
  const userLabel = useMemo(() => {
    if (!user) {
      return undefined
    }

    return getUserLabel(locale, Boolean(user.is_anonymous), user.email)
  }, [locale, user])
  const userIsAnonymous = Boolean(user?.is_anonymous)

  if (!isAuthReady) {
    return <AppBootScreen />
  }

  return (
    <Suspense fallback={<AppBootScreen />}>
      <Routes>
        <Route
          path="/"
          element={
            oauthRedirectError ? (
              <LoginPage authError={oauthRedirectError} />
            ) : isAuthenticated ? (
              <Navigate replace to="/dashboard" />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/login"
          element={oauthRedirectError || new URLSearchParams(location.search).get('mode') === 'password-reset' ? <LoginPage authError={loginError} /> : isAuthenticated ? <Navigate replace to="/dashboard" /> : <LoginPage authError={loginError} />}
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route
          path={PRIVACY_PAGE_HREF}
          element={<PrivacyPage />}
        />
        <Route path="/share/:code" element={<SharedRecordPage />} />
        <Route
          path="/models"
          element={
            isAuthenticated ? (
              <ModelsPage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <DashboardPage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/app"
          element={
            isAuthenticated ? (
              <WorkspacePage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/analytics"
          element={isAuthenticated ? <Navigate replace to="/dashboard#records" /> : <Navigate replace to="/login" />}
        />
        <Route
          path="/analytics/:id"
          element={
            isAuthenticated ? (
              <LabAnalyticsPage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/record/:id"
          element={
            isAuthenticated ? (
              <RecordPage isSigningOut={isSigningOut} onSignOut={signOut} userId={user?.id} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/record/:id/side-effects"
          element={
            isAuthenticated ? (
              <SideEffectsPage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/record/:id/follow-up"
          element={
            isAuthenticated ? (
              <FollowUpPage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/donate"
          element={
            isAuthenticated ? (
              <DonatePage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <SettingsPage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate replace to={isAuthenticated ? '/dashboard' : '/login'} />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter><AppContent /></BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
