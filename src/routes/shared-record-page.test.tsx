/**
 * [INPUT]: 依赖 node:fs 的源码合同检查，读取 shared-record-page 与 App 路由装配源码。
 * [OUTPUT]: 对外提供 /share/:code 只读页面合同测试，约束授权码加载、撤销/过期/错误反馈、禁用编辑导出和 AI 分析动作。
 * [POS]: routes 的分享页源码合同测试，避免公开分享误接入 /record/:id 的编辑、保存、导出或登录守卫。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function readSharedRouteSource() {
  return readFileSync(new URL('./shared-record-page.tsx', import.meta.url), 'utf8')
}

function readAppSource() {
  return readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
}

describe('shared record route contract', () => {
  it('mounts /share/:code without the authenticated /record guard', () => {
    const appSource = readAppSource()

    expect(appSource).toContain('const SharedRecordPage = lazy')
    expect(appSource).toContain('path="/share/:code"')
    expect(appSource.indexOf('path="/share/:code"')).toBeLessThan(appSource.indexOf('path="/app"'))
  })

  it('loads the record by authorization code and renders explicit failure states', () => {
    const source = readSharedRouteSource()

    expect(source).toContain('loadSharedPatientRecordByCode(code)')
    expect(source).toContain('分享已过期')
    expect(source).toContain('分享已撤销')
    expect(source).toContain('分享不可用')
  })

  it('keeps shared records read-only and disables analysis/export actions', () => {
    const source = readSharedRouteSource()

    expect(source).toContain('isEditable={false}')
    expect(source).toContain('isExportDisabled')
    expect(source).toContain('onClinicalAnalyze={undefined}')
    expect(source).toContain('onCommitField={undefined}')
    expect(source).toContain('onCommitRange={undefined}')
    expect(source).toContain('onExport={() => undefined}')
  })
})
