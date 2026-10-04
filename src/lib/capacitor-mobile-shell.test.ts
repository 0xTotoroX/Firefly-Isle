/**
 * [INPUT]: 依赖 node:fs、node:path、vitest、package.json、capacitor.config.ts、ios/ 与 android/ 平台工程文件。
 * [OUTPUT]: 对外提供 Capacitor 移动壳配置、脚本、原生 app id/name 与 signing ignore 边界合同测试。
 * [POS]: src/lib 的移动壳架构测试，确保 iOS/Android 只包装 dist Web build，不漂移到 dev server 或第二套产品壳。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const APP_ID = 'com.ghibli1024.fireflyisle'
const APP_NAME = '一页萤屿'
const CAPACITOR_VERSION = '8.5.2'

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('Capacitor mobile shell contract', () => {
  it('pins Capacitor packages and exposes the durable mobile scripts', () => {
    const pkg = JSON.parse(readProjectFile('package.json')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      scripts?: Record<string, string>
    }

    expect(pkg.dependencies?.['@capacitor/core']).toBe(CAPACITOR_VERSION)
    expect(pkg.dependencies?.['@capacitor/ios']).toBe(CAPACITOR_VERSION)
    expect(pkg.dependencies?.['@capacitor/android']).toBe(CAPACITOR_VERSION)
    expect(pkg.devDependencies?.['@capacitor/cli']).toBe(CAPACITOR_VERSION)
    expect(readProjectFile('ios/App/CapApp-SPM/Package.swift')).toContain(`exact: "${CAPACITOR_VERSION}"`)
    expect(pkg.scripts?.['mobile:sync']).toBe('npm run build && cap sync')
    expect(pkg.scripts?.['mobile:open:ios']).toBe('cap open ios')
    expect(pkg.scripts?.['mobile:open:android']).toBe('cap open android')
  })

  it('loads the production web build without a dev-server URL', () => {
    const config = readProjectFile('capacitor.config.ts')

    expect(config).toContain(`appId: '${APP_ID}'`)
    expect(config).toContain(`appName: '${APP_NAME}'`)
    expect(config).toContain("webDir: 'dist'")
    expect(config).toContain("androidScheme: 'https'")
    expect(config).not.toMatch(/\burl\s*:/)
    expect(config).not.toContain('localhost')
    expect(config).not.toContain('127.0.0.1')
  })

  it('keeps native project identifiers aligned with the shared app id and name', () => {
    expect(readProjectFile('ios/App/App.xcodeproj/project.pbxproj')).toContain(`PRODUCT_BUNDLE_IDENTIFIER = ${APP_ID};`)
    expect(readProjectFile('ios/App/App/Info.plist')).toContain(`<string>${APP_NAME}</string>`)
    expect(readProjectFile('android/app/build.gradle')).toContain(`applicationId "${APP_ID}"`)
    expect(readProjectFile('android/app/src/main/res/values/strings.xml')).toContain(`<string name="app_name">${APP_NAME}</string>`)
    expect(readProjectFile('android/app/src/androidTest/java/com/ghibli1024/fireflyisle/ExampleInstrumentedTest.java')).toContain(APP_ID)
  })

  it('keeps platform signing secrets out of Git', () => {
    const rootIgnore = readProjectFile('.gitignore')
    const iosIgnore = readProjectFile('ios/.gitignore')
    const androidIgnore = readProjectFile('android/.gitignore')

    expect(rootIgnore).toContain('*.p12')
    expect(rootIgnore).toContain('*.mobileprovision')
    expect(rootIgnore).toContain('*.jks')
    expect(rootIgnore).toContain('*.keystore')
    expect(iosIgnore).toContain('*.p12')
    expect(iosIgnore).toContain('*.mobileprovision')
    expect(androidIgnore).toContain('*.jks')
    expect(androidIgnore).toContain('*.keystore')
  })
})
