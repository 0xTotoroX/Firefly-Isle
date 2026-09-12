/**
 * [INPUT]: 依赖 react 的 lazy/Suspense/useMemo，依赖 react-router-dom 的 BrowserRouter、Routes、Route、Navigate、useLocation，依赖 ThemeProvider、BackgroundAudioProvider、AuthProvider、PrivacyGate、NetworkStatusBanner、PRIVACY_PAGE_HREF 与按路由动态加载的页面组件。
 * [OUTPUT]: 对外提供 App 组件。
 * [POS]: src 的路由装配入口，连接主题系统、隐私门控、双层渲染崩溃护栏、PWA 离线状态提示、Supabase session 持久化、匿名/非匿名身份标记、隔离设计预览、公开 Demo、记录页用户归属保存 id、OAuth 错误归一与 /login、/auth/callback、/privacy、/design-preview、/app、/demo、/record/:id、/share/:code、/analytics/:id、/dashboard、/models 页面。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { lazy, Suspense, type ReactNode, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { PrivacyGate } from '@/components/privacy-gate'
import { ErrorBoundary } from '@/components/error-boundary'
import { NetworkStatusBanner } from '@/components/system/network-status-banner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { BackgroundAudioProvider } from '@/lib/background-audio'
import { getCopy, copy } from '@/lib/copy'
import { LocaleProvider, useLocale } from '@/lib/locale'
import { PRIVACY_PAGE_HREF } from '@/lib/privacy'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { getOAuthCallbackErrorMessage } from '@/routes/auth-callback-page.logic'

const DonatePage = lazy(() => import('@/routes/donate-page').then((module) => ({ default: module.DonatePage })))
const DashboardPage = lazy(() => import('@/routes/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const AuthCallbackPage = lazy(() => import('@/routes/auth-callback-page').then((module) => ({ default: module.AuthCallbackPage })))
const BrandLockupPreviewPage = lazy(() => import('@/routes/brand-lockup-preview-page').then((module) => ({ default: module.BrandLockupPreviewPage })))
const DesignPreviewPage = lazy(() => import('@/routes/design-preview-page').then((module) => ({ default: module.DesignPreviewPage })))
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

function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <BackgroundAudioProvider>
          <NetworkStatusBanner />
          {children}
        </BackgroundAudioProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}

function AppContent() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteErrorBoundary>
          <PrivacyGate>
            <AppRoutes />
          </PrivacyGate>
        </RouteErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  )
}

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()

  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
}

function AppRoutes() {
  const { authError, isAuthenticated, isAuthReady, isSigningOut, signOut, user } = useAuth()
  const { locale } = useLocale()
  const location = useLocation()
  const oauthRedirectError = getOAuthCallbackErrorMessage(location.search)
  const loginError = authError ?? oauthRedirectError
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
            isAuthenticated ? (
              <Navigate replace to="/dashboard" />
            ) : oauthRedirectError ? (
              <LoginPage authError={oauthRedirectError} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate replace to="/dashboard" /> : <LoginPage authError={loginError} />}
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path={PRIVACY_PAGE_HREF}
          element={<PrivacyPage />}
        />
        <Route path="/share/:code" element={<SharedRecordPage />} />
        <Route path="/brand-lockup-preview" element={<BrandLockupPreviewPage />} />
        <Route path="/design-preview" element={<DesignPreviewPage />} />
        <Route path="/demo" element={<Navigate replace to="/demo/record" />} />
        <Route path="/demo/record" element={<RecordPage userIsAnonymous userLabel="DEMO_MODE" />} />
        <Route path="/demo/analytics" element={<LabAnalyticsPage userIsAnonymous userLabel="DEMO_MODE" />} />
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
          element={isAuthenticated ? <Navigate replace to="/analytics/demo" /> : <Navigate replace to="/login" />}
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
      <AppProviders>
        <AppContent />
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
