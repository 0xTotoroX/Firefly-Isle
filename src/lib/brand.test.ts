/**
 * [INPUT]: brand 与浏览器入口、安装清单、导出实现、CSP。
 * [OUTPUT]: 检查跨格式品牌展示一致和技术兼容边界。
 * [POS]: lib 品牌迁移合同，不依赖后端或私人数据。
 * [PROTOCOL]: 品牌或兼容边界变化时同步此测试。
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { brand } from './brand'

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')

describe('brand display and compatibility', () => {
  it('keeps browser and install metadata aligned with the selected name', () => {
    const html = read('index.html')
    const manifest = JSON.parse(read('public/manifest.webmanifest'))
    expect(html).toContain(`<title>${brand.pageTitle.zh}</title>`)
    expect(html).toContain(`content="${brand.description.zh}"`)
    expect(manifest.name).toBe(`${brand.name.zh} ${brand.name.en}`)
    expect(manifest.short_name).toBe(brand.name.zh)
    expect([manifest.id, manifest.start_url, manifest.scope]).toEqual(['/', '/', '/'])
  })

  it('retains the account export protocol and persisted preference keys', () => {
    expect(read('src/lib/account-data-export.ts')).toContain("format: 'firefly-isle.account-export'")
    expect(read('src/lib/locale.tsx')).toContain("LOCALE_STORAGE_KEY = 'firefly-locale'")
    expect(read('src/lib/theme.tsx')).toContain("'firefly-theme'")
    expect(read('public/sw.js')).toContain('firefly-pwa-')
  })

  it('keeps the actual theme bootstrap covered by the deployed CSP', () => {
    const script = read('index.html').match(/<script>([\s\S]*?)<\/script>/)?.[1]
    expect(script).toBeTruthy()
    const hash = createHash('sha256').update(script!).digest('base64')
    expect(read('public/_headers')).toContain(`'sha256-${hash}'`)
  })
})
