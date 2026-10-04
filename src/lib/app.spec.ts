/**
 * [INPUT]: 依赖 node:fs 的源码合同检查，依赖隐私文案真相源与 PatientRecord 类型工具。
 * [OUTPUT]: 对外提供隐私内容、患者类型判定、认证路由、公开 Demo 路由、统计路由、分享路由、隐私页动效与背景音 Provider 挂载位置的回归测试。
 * [POS]: lib 的应用级合同测试，约束 App 装配层不丢失隐私、路由守卫、公开 Demo、公开只读分享入口、OAuth 错误、隐私页全站动效与全局背景音生命周期边界。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  PRIVACY_PAGE_HREF,
  PRIVACY_POLICY_ITEMS,
  PRIVACY_POLICY_SUMMARY,
} from '@/lib/privacy'
import { getPatientArchetype, type PatientRecord } from '@/types/patient'

function readAppSource() {
  return readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
}

function readPrivacyPageSource() {
  return readFileSync(new URL('../routes/privacy-page.tsx', import.meta.url), 'utf8')
}

describe('privacy content', () => {
  it('exposes a stable privacy route and shared policy content', () => {
    expect(PRIVACY_PAGE_HREF).toBe('/privacy')
    expect(PRIVACY_POLICY_SUMMARY.length).toBeGreaterThan(0)
    expect(PRIVACY_POLICY_ITEMS).toHaveLength(3)
  })

  it('keeps the privacy route in the shared motion system without turning it into a loud app panel', () => {
    const source = readPrivacyPageSource()

    expect(source).toContain('t-route-reveal')
    expect(source).toContain('t-stagger')
    expect(source).toContain('style={{')
    expect(source).not.toContain('t-missing-pulse')
    expect(source).not.toContain('t-gantt-grow')
  })
})

describe('patient archetype detection', () => {
  it('detects the three MVP archetypes', () => {
    const nonAdvanced: PatientRecord = {
      initialOnset: { triggerDate: '2022-03' },
      treatmentLines: [],
    }
    const deNovoAdvanced: PatientRecord = {
      treatmentLines: [{ lineNumber: 1, regimen: '培美曲塞联合卡铂' }],
    }
    const relapsedAdvanced: PatientRecord = {
      initialOnset: { triggerDate: '2022-03' },
      treatmentLines: [{ lineNumber: 1, regimen: '培美曲塞联合卡铂' }],
    }

    expect(getPatientArchetype(nonAdvanced)).toBe('non-advanced')
    expect(getPatientArchetype(deNovoAdvanced)).toBe('de-novo-advanced')
    expect(getPatientArchetype(relapsedAdvanced)).toBe('relapsed-advanced')
  })
})

describe('auth route guard contract', () => {
  it('keeps /login public but redirects authenticated users to /dashboard', () => {
    const source = readAppSource()

    expect(source).toContain('path="/login"')
    expect(source).toContain('isAuthenticated ? <Navigate replace to="/dashboard" /> : <LoginPage authError={loginError} />')
  })

  it('keeps /app protected and sends anonymous users back to /login', () => {
    const source = readAppSource()

    expect(source).toContain('path="/app"')
    expect(source).toContain('<Navigate replace to="/login" />')
  })

  it('keeps /analytics protected and sends unselected patients to the dashboard', () => {
    const source = readAppSource()

    expect(source).toContain('const LabAnalyticsPage = lazy')
    expect(source).toContain('path="/analytics"')
    expect(source).toContain('to="/dashboard#records"')
    expect(source).toContain('path="/analytics/:id"')
    expect(source).toContain('<LabAnalyticsPage isSigningOut={isSigningOut} onSignOut={signOut} userIsAnonymous={userIsAnonymous} userLabel={userLabel} />')
  })

  it('mounts public full-product Demo routes before authenticated workspaces', () => {
    const source = readAppSource()

    expect(source).toContain('path="/demo"')
    expect(source).toContain('to="/demo/dashboard"')
    expect(source).toContain('path="/demo/record"')
    expect(source).toContain('path="/demo/analytics"')
    expect(source).toContain('<DemoSessionProvider><DemoRoutes /></DemoSessionProvider>')
    expect(source).toContain('path="/demo/record/:id/follow-up"')
    expect(source).toContain('path="/demo/record/:id/side-effects"')
    expect(source).toContain('path="/demo/app"')
    expect(source).toContain('path="/demo/settings"')
    expect(source).toContain('path="/demo/models"')
    expect(source.indexOf('path="/demo/record"')).toBeLessThan(source.indexOf('path="/app"'))
  })

  it('keeps /share/:code public so authorization codes can open read-only records', () => {
    const source = readAppSource()

    expect(source).toContain('const SharedRecordPage = lazy')
    expect(source).toContain('path="/share/:code"')
    expect(source).toContain('element={<SharedRecordPage />}')
  })

  it('keeps OAuth callback on a public route before the /app guard runs', () => {
    const source = readAppSource()

    expect(source).toContain('path="/auth/callback"')
    expect(source).toContain('element={<AuthCallbackPage />}')
  })

  it('surfaces root-level OAuth provider errors instead of discarding them during redirect', () => {
    const source = readAppSource()

    expect(source).toContain('const oauthRedirectError = getOAuthCallbackErrorMessage(`${location.search}${location.hash}`, locale)')
    expect(source).toContain('<LoginPage authError={oauthRedirectError} />')
  })

  it('keeps background audio above route changes so navigation does not reset playback state', () => {
    const source = readAppSource()

    expect(source).toContain('BackgroundAudioProvider')
    expect(source).toContain('<BackgroundAudioProvider persist={persist}>')
    expect(source.indexOf('<NetworkStatusBanner />')).toBeGreaterThan(source.indexOf('<BackgroundAudioProvider persist={persist}>'))
    expect(source.indexOf('{children}')).toBeGreaterThan(source.indexOf('<BackgroundAudioProvider persist={persist}>'))
    expect(source.indexOf('<BackgroundAudioProvider persist={persist}>')).toBeLessThan(source.indexOf('<AppContent />'))
  })
})
