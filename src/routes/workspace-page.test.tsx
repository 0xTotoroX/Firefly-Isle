/**
 * [INPUT]: 依赖 react-dom/server 的静态渲染，依赖 react-router-dom 的 MemoryRouter，依赖 vitest 的模块 mock，依赖 BackgroundAudioProvider、patient-record-storage 与 ./workspace-page。
 * [OUTPUT]: 对外提供工作区报告预览、输入 composer、侧栏壳层、空工作区导航边界、职责边界、患者记录持久化、Transitions.dev 动效、模型设置整块收起态与 locale 回归测试。
 * [POS]: routes 的工作区测试文件，约束 /app 报告区复刻病历预览主表面、真实治疗线预览、真实空白态禁用病历/统计入口而不跳公开 Demo、无正式导出入口、textarea 输入工具行、提取/追问/缺失数字/全站动效、背景音 topbar 依赖、模型设置紧凑整块展开入口、创作初衷纸页入口、邮件 hover 联系弹窗与邮箱点击复制入口、中英艺术字标、无装饰性状态卡侧栏、主题/语言顺序、active 细左标与低强度行面导航、紧凑默认侧栏弹出态、隐藏态左缘渐进拉出与拖拽到隐藏。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'

let currentTheme: 'light' | 'dark' = 'light'
const localeStorage = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string) => localeStorage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    localeStorage.set(key, value)
  },
  removeItem: (key: string) => {
    localeStorage.delete(key)
  },
}

vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('window', { localStorage: localStorageMock })

function setLocale(locale: 'zh' | 'en') {
  localeStorage.set('firefly-locale', locale)
}

function resetLocale() {
  localeStorage.clear()
}

beforeEach(() => {
  resetLocale()
})

afterEach(() => {
  resetLocale()
})


vi.mock('@/lib/theme', () => ({
  useTheme: () => ({ accent: '#E85D2A', setAccent: () => undefined, theme: currentTheme, setTheme: () => undefined, toggleTheme: () => undefined }),
}))

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    useOptionalAuth: () => ({
      authError: null,
      isAuthenticated: true,
      isAuthReady: true,
      isSigningOut: false,
      session: null,
      signOut: vi.fn(),
      user: { id: 'user-1', is_anonymous: true },
    }),
  }
})

import { WorkspacePage } from './workspace-page'
import { ArchiveSideNav } from '@/components/app-shell'
import { ExtractionComposer } from '@/components/workspace/extraction-composer'
import { FollowUpPanel } from '@/components/workspace/follow-up-panel'
import { ReportPreviewFrame } from '@/components/workspace/report-preview-frame'
import type { PatientRecord } from '@/types/patient'

function renderWorkspace(
  theme: 'light' | 'dark',
  options: { userIsAnonymous?: boolean; userLabel?: string } = {},
) {
  currentTheme = theme
  return renderToStaticMarkup(
    <LocaleProvider>
      <BackgroundAudioProvider>
        <MemoryRouter initialEntries={['/app']}>
          <WorkspacePage
            isSigningOut={false}
            onSignOut={() => undefined}
            userIsAnonymous={options.userIsAnonymous ?? true}
            userLabel={options.userLabel ?? 'ANON_SESSION'}
          />
        </MemoryRouter>
      </BackgroundAudioProvider>
    </LocaleProvider>,
  )
}

function readSidebarSource() {
  return readFileSync(new URL('../components/system/sidebar-nav.tsx', import.meta.url), 'utf8')
}

function readBrandWordmarkSource() {
  return readFileSync(new URL('../components/system/firefly-brand-wordmark.tsx', import.meta.url), 'utf8')
}

function readTopbarSource() {
  return readFileSync(new URL('../components/system/topbar.tsx', import.meta.url), 'utf8')
}

function readExtractionComposerSource() {
  return readFileSync(new URL('../components/workspace/extraction-composer.tsx', import.meta.url), 'utf8')
}

function readLlmProviderSettingsPanelSource() {
  return readFileSync(new URL('../components/workspace/llm-provider-settings-panel.tsx', import.meta.url), 'utf8')
}

function readOriginStoryPaperSource() {
  return readFileSync(new URL('../components/system/origin-story/origin-story-paper.tsx', import.meta.url), 'utf8')
}

function readOriginStoryContentSource() {
  return readFileSync(new URL('../components/system/origin-story/origin-story-content.ts', import.meta.url), 'utf8')
}

describe('WorkspacePage report shell', () => {
  it.each(['light', 'dark'] as const)('does not render the outer 临床结构化报告 heading shell in %s mode', (theme) => {
    const markup = renderWorkspace(theme)

    expect(markup).not.toContain('临床结构化报告')
    expect(markup).toContain('病历预览')
  })

  it('renders one primary extraction action and no discarded V3 control blocks in light mode', () => {
    const markup = renderWorkspace('light')

    expect(markup.match(/开始结构化提取/g)?.length).toBe(1)
    expect(markup).not.toContain('语音录入')
    expect(markup).not.toContain('当前参数')
  })

  it('keeps formal PDF and PNG export actions out of /app', () => {
    const markup = renderWorkspace('light')

    expect(markup).not.toContain('导出 PDF')
    expect(markup).not.toContain('导出 PNG')
  })

  it('keeps file import, voice and character count inside the textarea tool row', () => {
    const markup = renderWorkspace('light')

    expect(markup).toContain('id="patient-history-input"')
    expect(markup).toContain('maxLength="8000"')
    expect(markup).toContain('上传病历 / 检验报告')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('accept="image/*,application/pdf"')
    expect(markup).toContain('>mic</span>')
    expect(markup).toContain('0 / 8000')
  })

  it('keeps voice as coming-soon while making file import a real OCR input', () => {
    const markup = renderWorkspace('light')

    expect(markup).toContain('data-input-tool="import-record-file"')
    expect(markup).toContain('data-input-tool="voice-input"')
    expect(markup).not.toContain('title="上传病历 / 检验报告暂未开放"')
    expect(markup).toContain('title="语音输入暂未开放"')
  })

  it('links the composer to the standalone model settings page carrying the provider panel', () => {
    const markup = renderWorkspace('light')
    const panelSource = readLlmProviderSettingsPanelSource()
    const linkMarkup = markup.match(/<a[^>]*data-testid="composer-model-settings-link"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? ''

    expect(markup).toContain('data-testid="composer-model-settings-link"')
    expect(linkMarkup).toContain('模型设置')
    expect(linkMarkup).toContain('tune')
    expect(linkMarkup).toContain('href="/models"')

    expect(panelSource).toContain('setExpanded')
    expect(panelSource).toContain('data-llm-provider-settings="true"')
    expect(panelSource).toContain('系统内置（deepseek-v4-flash）')
    expect(panelSource).toContain('API 自提供')
    expect(panelSource).toContain('自定义')
    expect(panelSource).not.toContain('系统 DeepSeek')
    expect(panelSource).not.toContain('自带 Provider')
    expect(panelSource).not.toContain('自定义 OpenAI 风格接口')
    expect(panelSource).toContain('医疗记录内容会发送到你选择的第三方模型服务商')
  })

  it('shows recognized OCR text for confirmation before extraction', () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <MemoryRouter>
          <ExtractionComposer
          error={null}
          extractionInput=""
          isExtracting={false}
          isSaving={false}
          ocrState={{ error: null, isProcessing: false, text: '患者上传病历 OCR 文本' }}
          onConfirmOcrText={() => undefined}
          onDiscardOcrText={() => undefined}
          onExtract={() => undefined}
          onImportFile={() => undefined}
          onInputChange={() => undefined}
          onRetry={() => undefined}
          remainingMissingCount={0}
          retryMode={null}
          theme="light"
        />
        </MemoryRouter>
      </LocaleProvider>,
    )

    expect(markup).toContain('OCR 文本确认')
    expect(markup).toContain('患者上传病历 OCR 文本')
    expect(markup).toContain('确认并提取')
    expect(markup).toContain('丢弃')
  })

  it('uses Transitions.dev motion for extraction status changes', () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <MemoryRouter>
          <ExtractionComposer
          error={null}
          extractionInput="患者 2024 年开始治疗"
          isExtracting
          isSaving={false}
          onExtract={() => undefined}
          onInputChange={() => undefined}
          onRetry={() => undefined}
          remainingMissingCount={2}
          retryMode={null}
          theme="light"
        />
        </MemoryRouter>
      </LocaleProvider>,
    )

    expect(markup).toContain('t-icon-swap')
    expect(markup).toMatch(/class="[^"]*t-icon-swap[^"]*animate-spin[^"]*"/)
    expect(markup).toContain('data-state="b"')
    expect(markup).toContain('data-icon="a"')
    expect(markup).toContain('data-icon="b"')
    expect(markup).not.toMatch(/class="[^"]*t-icon[^"]*animate-spin[^"]*"[^>]*data-icon="b"/)
    expect(markup).toContain('t-text-swap')
  })

  it('mounts app workspace sections into the shared route and stagger motion layer', () => {
    const markup = renderWorkspace('dark')

    expect(markup).toContain('t-route-reveal')
    expect(markup).toContain('t-stagger')
    expect(markup).toContain('style="--t-order:1"')
    expect(markup).not.toContain('t-route-reveal t-stagger')
    expect(markup).not.toContain('t-stagger t-route-reveal')
  })

  it('uses the shared control and alert motion contracts inside the composer and preview', () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <MemoryRouter>
          <ExtractionComposer
          error="测试错误"
          extractionInput=""
          feedback="已保存"
          isExtracting={false}
          isSaving
          ocrState={{ error: null, isProcessing: false, text: 'OCR 文本' }}
          onConfirmOcrText={() => undefined}
          onDiscardOcrText={() => undefined}
          onExtract={() => undefined}
          onInputChange={() => undefined}
          onRetry={() => undefined}
          remainingMissingCount={3}
          retryMode="initial"
          theme="dark"
        />
        </MemoryRouter>
      </LocaleProvider>,
    )

    expect(markup).toContain('t-control-press')
    expect(markup).toContain('t-popover')

    // t-accordion 随 provider 设置面板迁往 /models；动效合同随组件走。
    expect(readLlmProviderSettingsPanelSource()).toContain('t-accordion')
  })

  it('keeps topbar overlays mutually exclusive and bridges contact hover to the popover', () => {
    const source = readTopbarSource()

    expect(source).toContain("type TopbarOverlay = 'contact' | 'origin-story' | null")
    expect(source).toContain('const [openOverlay, setOpenOverlay]')
    expect(source).toContain("setOpenOverlay((current) => (current === 'origin-story' ? null : 'origin-story'))")
    expect(source).toContain('const contactCloseTimerRef')
    expect(source).toContain('const openContact = () =>')
    expect(source).toContain('const scheduleContactClose = () =>')
    expect(source).toContain('onPointerEnter={openContact}')
    expect(source).toContain('onPointerLeave={scheduleContactClose}')
    expect(source).toContain("setOpenOverlay((current) => (current === 'contact' ? null : current))")
    expect(source).toContain('data-testid="topbar-contact-hover-bridge"')
    expect(source).toContain('t-popover')
    expect(source).toContain('fixed right-4 top-[calc(var(--ff-topbar-height)+0.75rem)]')
    expect(source).not.toContain('const [contactOpen, setContactOpen]')
    expect(source).not.toContain('const [originStoryOpen, setOriginStoryOpen]')
  })

  it('keeps the primary extraction action text visible during text-swap transitions', () => {
    const source = readExtractionComposerSource()

    expect(source).toContain('t-text-swap')
    expect(source).not.toContain('is-enter-start')
  })

  it('reveals follow-up questions with the shared panel-slide transition', () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <FollowUpPanel currentQuestion="请补充治疗方案。" onSubmit={() => undefined} theme="light" />
      </LocaleProvider>,
    )

    expect(markup).toContain('t-panel-slide')
    expect(markup).toContain('data-open="true"')
    expect(markup).toContain('请补充治疗方案。')
  })

  it('animates missing-field alerts and editable cells in the report preview', () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={{ treatmentLines: [] }}
          remainingMissing={['肿瘤类型', '分期', '治疗方案']}
          setReportRef={() => undefined}
          theme="dark"
        />
      </LocaleProvider>,
    )

    expect(markup).toContain('t-missing-pulse')
    expect(markup).toContain('t-edit-flip')
  })

  it('links a persisted preview record to its formal record page while preserving the export ref', () => {
    const record: PatientRecord = {
      basicInfo: { age: 63, stage: 'IV', tumorType: 'NSCLC' },
      id: 'patient-42',
      treatmentLines: [{ lineNumber: 1, regimen: 'Osimertinib' }],
    }
    let reportNode: HTMLDivElement | null = null

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LocaleProvider>
          <ReportPreviewFrame
            isExtracting={false}
            isSaving={false}
            onCommitField={() => undefined}
            record={record}
            recordDetailsHref="/record/patient-42"
            remainingMissing={[]}
            setReportRef={(node) => {
              reportNode = node
            }}
            theme="light"
          />
        </LocaleProvider>
      </MemoryRouter>,
    )

    expect(reportNode).toBeNull()
    expect(markup).toContain('病历预览')
    expect(markup).toContain('href="/record/patient-42"')
    expect(markup).toContain('打开病历详情')
  })

  it('renders real treatment line content in the preview timeline instead of static placeholders', () => {
    const record: PatientRecord = {
      basicInfo: { stage: 'IV', tumorType: '乳腺癌' },
      initialOnset: {
        treatment: 'AC方案4次、放疗25+5；依西美坦+亮丙',
        triggerDate: '2021-07',
      },
      treatmentLines: [
        { endDate: '2023-05', lineNumber: 1, regimen: '阿贝西利+氟维司群+亮丙瑞林+地舒单抗', startDate: '2022-10' },
        { endDate: '2023-10', lineNumber: 2, regimen: '哌柏西利+氟维司群+亮丙瑞林+地舒单抗', startDate: '2023-05' },
      ],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={[]}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).toContain('AC方案4次、放疗25+5；依西美坦+亮丙')
    expect(markup).toContain('阿贝西利+氟维司群+亮丙瑞林+地舒单抗')
    expect(markup).toContain('2022-10 → 2023-05')
    expect(markup).toContain('哌柏西利+氟维司群+亮丙瑞林+地舒单抗')
    expect(markup).not.toContain('初发治疗（可选）')
    expect(markup).not.toContain('3L 治疗线')
  })

  it('does not render demo demographic values as missing real patient fields', () => {
    const record: PatientRecord = {
      treatmentLines: [],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={[]}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).not.toContain('张三')
    expect(markup).not.toContain('56 岁')
    expect(markup).not.toContain('>女<')
    expect(markup).toContain('等待病程节点')
    expect(markup).not.toContain('>待</div>')
    expect(markup).not.toContain('>草稿</span>')
    expect(markup).not.toContain('border-dotted')
  })

  it('animates missing-field counts with Transitions.dev digit pop-in classes', () => {
    const record: PatientRecord = {
      basicInfo: { age: 63 },
      treatmentLines: [],
    }

    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <ReportPreviewFrame
          followUpCount={1}
          isExtracting={false}
          isSaving={false}
          onCommitField={() => undefined}
          record={record}
          remainingMissing={['肿瘤类型', '分期', '治疗方案']}
          setReportRef={() => undefined}
          theme="light"
        />
      </LocaleProvider>,
    )

    expect(markup).toContain('t-digit-group')
    expect(markup).toContain('is-animating')
    expect(markup).toContain('t-digit')
    expect(markup).toContain('待补充')
    expect(markup).toContain('第')
  })

  it('does not render the decorative sidebar system-status card', () => {
    const zhMarkup = renderWorkspace('light')

    expect(zhMarkup).not.toContain('运行正常')

    setLocale('en')
    const enMarkup = renderWorkspace('light')

    expect(enMarkup).not.toContain('Operational')
    expect(enMarkup).not.toContain('System Ready')
  })

  it('turns the topbar settings placeholder into a hover contact card with clickable email copy', () => {
    const markup = renderWorkspace('light')
    const topbarSource = readTopbarSource()

    expect(markup).toMatch(/<button[^>]*aria-controls="topbar-contact-card"[^>]*aria-expanded="false"[^>]*aria-label="联系我"[^>]*data-topbar-action="contact"/)
    expect(markup).toContain('title="联系方式"')
    expect(markup).toContain('>mail</span>')
    expect(topbarSource).not.toContain('>settings</span>')
    expect(topbarSource).not.toContain('设置，敬请期待')
    expect(markup).not.toContain('data-testid="topbar-contact-card"')
    expect(topbarSource).toContain('topbar-contact-card')
    expect(topbarSource).toContain('小生才疏学浅，有任何问题都可以通过')
    expect(topbarSource).toContain("const CONTACT_EMAIL = 'ghibli1024@gmail.com'")
    expect(topbarSource).toContain('writeClipboardText(CONTACT_EMAIL)')
    // 剪贴板实现抽到了 @/lib/clipboard，顶栏只保留调用点
    expect(topbarSource).toContain("from '@/lib/clipboard'")
    expect(topbarSource).not.toContain("document.execCommand('copy')")
    expect(topbarSource).toContain('data-contact-email={CONTACT_EMAIL}')
    expect(topbarSource).toContain('data-testid="topbar-contact-copy-status"')
    expect(topbarSource).toContain('copy.shell.topbar.contact.copyEmail')
    expect(topbarSource).toContain('copy.shell.topbar.contact.copied')
  })

  it('renders the sidebar brand title as an artistic wordmark', () => {
    localeStorage.set('firefly-sidebar-expanded-width-v8', '220')
    const markup = renderWorkspace('dark')
    const brandWordmarkSource = readBrandWordmarkSource()
    const sidebarSource = readSidebarSource()

    expect(markup).toContain('data-brand-art-wordmark="true"')
    expect(markup).toContain('data-brand-wordmark="true"')
    expect(markup).toContain('data-brand-firefly-glow="true"')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('一页<span')
    expect(markup).toContain('萤</span>屿')
    expect(markup).not.toContain('Firefly Isle')
    expect(brandWordmarkSource).toContain("fontFamily: 'var(--ff-font-display)'")
    expect(brandWordmarkSource).toContain("textShadow: '.35px 0 var(--ff-accent-primary), 0 0 12px rgba(232,93,42,0.28)'")
    expect(brandWordmarkSource).toContain('fireflyGlyphAuraStyle')
    expect(brandWordmarkSource).toContain('radial-gradient(circle at 58% 50%, color-mix(in srgb, var(--ff-accent-primary) 44%, transparent)')
    expect(brandWordmarkSource).toContain("filter: 'blur(4px)'")
    expect(brandWordmarkSource).toContain("inset: '-0.12em -0.08em -0.08em -0.1em'")
    expect(brandWordmarkSource).not.toContain("filter: 'blur(7px)'")
    expect(brandWordmarkSource).toContain("scale === 'login' ? 'w-[min(22rem,82%)]' : 'w-[92px]'")
    expect(brandWordmarkSource).not.toContain('w-14 max-w-full')
    expect(brandWordmarkSource).not.toContain('STXingkai_SC')
    expect(brandWordmarkSource).not.toContain('STXingkai SC')
    expect(brandWordmarkSource).not.toContain('STKaiti')
    expect(brandWordmarkSource).not.toContain('Kaiti SC')
    expect(sidebarSource).toContain("compact ? 'items-center justify-center' : 'items-end justify-start gap-1.5'")
  })

  it('renders only the English brand wordmark when locale is English', () => {
    localeStorage.set('firefly-sidebar-expanded-width-v8', '220')
    setLocale('en')
    const markup = renderWorkspace('dark')
    const brandWordmarkSource = readBrandWordmarkSource()

    expect(markup).toContain('data-brand-art-wordmark="true"')
    expect(markup).toContain('data-brand-wordmark="true"')
    expect(markup).toContain('data-brand-firefly-glow="true"')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('Firefly</span> Isle')
    expect(brandWordmarkSource).toContain('const englishSidebarBrandWordmarkStyle')
    expect(brandWordmarkSource).toContain("fontFamily: 'var(--ff-font-display)'")
    expect(brandWordmarkSource).toContain('const englishLoginBrandWordmarkStyle')
    expect(brandWordmarkSource).toContain('fontFamily: \'"Snell Roundhand", "Savoye LET", "Apple Chancery", cursive\'')
    expect(brandWordmarkSource).toContain("scale === 'login' ? englishLoginBrandWordmarkStyle : englishSidebarBrandWordmarkStyle")
    expect(brandWordmarkSource).toContain("'overflow-visible whitespace-nowrap text-[25px] font-black leading-none tracking-normal'")
    expect(brandWordmarkSource).not.toContain("'truncate whitespace-nowrap text-[23px] font-black tracking-normal'")
    expect(brandWordmarkSource).not.toContain("'overflow-visible whitespace-nowrap text-[29px] font-bold tracking-normal'")
    expect(brandWordmarkSource).not.toContain("'overflow-visible whitespace-nowrap text-[27px] font-black tracking-normal'")
    expect(brandWordmarkSource).not.toContain("transform: 'translateY(3px)'")
    expect(brandWordmarkSource).not.toContain('"Avenir Next", "Trebuchet MS", system-ui, sans-serif')
    expect(markup).not.toContain('一页')
    expect(markup).not.toContain('萤</span>屿')
  })

  it('uses a low-intensity active sidebar row with a left marker instead of a heavy card', () => {
    const markup = renderWorkspace('light')
    const sidebarSource = readSidebarSource()

    expect(markup).toMatch(/<a[^>]*class="[^"]*text-\[var\(--ff-accent-text\)\][^"]*"[^>]*href="\/app"/)
    expect(markup).not.toContain('data-sidebar-active-marker="true"')
    expect(sidebarSource).toContain('bg-[color-mix(in_srgb,var(--ff-accent-primary)_8%,transparent)]')
    expect(sidebarSource).not.toContain('border-[color-mix(in_srgb,var(--ff-accent-primary)_24%,transparent)]')
    expect(markup).not.toContain('bg-[linear-gradient(90deg,color-mix(in_srgb,var(--ff-accent-primary)_18%,transparent)')
    expect(markup).not.toContain('absolute left-0 top-0 h-full w-[3px] bg-[var(--ff-accent-primary)]')
    expect(markup).not.toContain('absolute right-0 top-0 h-full w-[3px] bg-[var(--ff-accent-primary)]')
  })

  it('uses the display font for expanded sidebar menu labels', () => {
    localeStorage.set('firefly-sidebar-expanded-width-v8', '220')
    const markup = renderWorkspace('light')
    const sidebarSource = readSidebarSource()

    expect(sidebarSource).toContain("font-[var(--ff-font-display)]`")
    expect(sidebarSource).toContain("renderLabel(label, cn('text-[16px] font-semibold leading-none'")
    expect(sidebarSource).toContain("'text-[15px] font-medium'")
    expect(markup).toMatch(/<span class="[^"]*font-\[var\(--ff-font-display\)\][^"]*">提取<\/span>/)
    expect(markup).toMatch(/<span class="[^"]*font-\[var\(--ff-font-display\)\][^"]*">设置<\/span>/)
  })

  it('uses semantically specific Material icons for sidebar record and language actions', () => {
    const markup = renderWorkspace('light')

    expect(markup).not.toContain('>g_translate</span>')
    expect(markup).toContain('>clinical_notes</span>')
    expect(markup).not.toContain('>folder</span>')
    expect(markup).not.toContain('>translate</span>')
    expect(markup).not.toContain('>language</span>')
    expect(markup).not.toContain('>expand_more</span>')
  })

  it('keeps explicit Demo navigation separate from a persisted record link', () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/app']}>
          <ArchiveSideNav analyticsHref="/demo/analytics" dark={false} recordHref="/record/patient-42" userIsAnonymous userLabel="ANON_SESSION" />
        </MemoryRouter>
      </LocaleProvider>,
    )

    expect(markup).toContain('href="/record/patient-42"')
    expect(markup).toContain('href="/demo/analytics"')
    expect(markup).toContain('>Demo</span>')
    expect(markup).not.toContain('href="/record/demo"')
  })

  it('keeps theme, language, and donate off the sidebar because settings owns those controls', () => {
    const markup = renderWorkspace('light')

    expect(markup).not.toContain('>主题</span>')
    expect(markup).not.toContain('>语言</span>')
    expect(markup).not.toContain('>捐赠</span>')
    expect(markup).not.toContain('>g_translate</span>')
    expect(markup).not.toContain('>dark_mode</span>')
    expect(markup).toContain('>设置</span>')
  })

  it('uses the person icon for non-anonymous authenticated identities', () => {
    const markup = renderWorkspace('light', {
      userIsAnonymous: false,
      userLabel: 'ghibli1024@gmail.com',
    })

    expect(markup).toMatch(/<div[^>]*aria-label="ghibli1024@gmail\.com"[^>]*>[\s\S]*?>person<\/span>/)
    expect(markup).not.toMatch(/<div[^>]*aria-label="ghibli1024@gmail\.com"[^>]*>[\s\S]*?>theater_comedy<\/span>/)
  })

  it('keeps the theater mask icon for anonymous identities', () => {
    const markup = renderWorkspace('light', {
      userIsAnonymous: true,
      userLabel: 'ANON_SESSION',
    })

    expect(markup).toMatch(/<div[^>]*aria-label="ANON_SESSION"[^>]*>[\s\S]*?>theater_comedy<\/span>/)
  })

  it('keeps no-record navigation unavailable until extraction instead of routing to public Demo', () => {
    const markup = renderWorkspace('light')
    const sidebarSource = readSidebarSource()

    expect(markup).toContain('aria-label="病历：先提取"')
    expect(markup).toContain('aria-label="统计：先提取"')
    expect(markup).toContain('data-nav-unavailable="true"')
    expect(markup).toContain('>先提取</span>')
    expect(markup).not.toContain('href="/demo/record"')
    expect(markup).not.toContain('href="/demo/analytics"')
    expect(markup).not.toContain('href="/login"')
    expect(sidebarSource).not.toContain("analyticsHref = '/demo/analytics'")
    expect(sidebarSource).not.toContain("recordHref ?? '/demo/record'")
    expect(sidebarSource).toContain('data-nav-unavailable="true"')
  })

  it('wires the life-story button to the origin story paper with a semantic icon', () => {
    const topbarSource = readTopbarSource()

    expect(topbarSource).toContain('OriginStoryPaper')
    expect(topbarSource).toContain('originStoryOpen')
    expect(topbarSource).toContain('originStoryButtonRef')
    expect(topbarSource).toContain('          eco')
    expect(topbarSource).toContain("title={locale === 'zh' ? '为什么做一页萤屿' : 'Why Firefly Isle'}")
    expect(topbarSource).toContain("aria-label={locale === 'zh' ? '为什么做一页萤屿' : 'Why Firefly Isle'}")
    expect(topbarSource).not.toContain('helpButtonRef')
    expect(topbarSource).not.toContain('          help')
  })

  it('keeps the origin story as a public-source summary', () => {
    const source = readOriginStoryContentSource()

    expect(source).toContain('originStorySourceUrl')
    expect(source).toContain('https://www.youtube.com/post/Ugkx2pyfj6hZm_j7M4tjutIm7D9BFqg-mfyB')
    expect(source).toContain('originStorySourceLabel')
    expect(source).toContain('storyParagraphs')
  })

  it('uses the V3 clinical archive dialog without a separate paper or WebGL material system', () => {
    const source = readOriginStoryPaperSource()

    expect(source).toContain('var(--ff-surface-panel)')
    expect(source).toContain('var(--ff-border-default)')
    expect(source).toContain('var(--ff-accent-primary)')
    expect(source).toContain('t-modal is-open')
    expect(source).toContain('aria-label="关闭创作初衷"')
    expect(source).toContain('focusableSelector')
    expect(source).toContain('document.body.style.overflow')
    expect(source).not.toContain("from 'three'")
    expect(source).not.toContain('<canvas')
    expect(source).not.toContain('supportsWebGL')
    expect(source).not.toContain('font-bold">{paragraph}')
    expect(source).not.toContain('<a ')
  })

  it('keeps the hidden-sidebar restore handle narrow', () => {
    const sidebarSource = readSidebarSource()

    expect(sidebarSource).toContain('w-[14px]')
    expect(sidebarSource).toContain('hover:w-[18px]')
    expect(sidebarSource).not.toContain('w-5 -translate-y-1/2')
    expect(sidebarSource).not.toContain('hover:w-7')
  })

  it('supports gradual left-edge reveal and drag-to-hide sidebar behavior', () => {
    const sidebarSource = readSidebarSource()

    expect(sidebarSource).toContain('HIDDEN_EDGE_HIT_WIDTH')
    expect(sidebarSource).toContain('HIDDEN_SWIPE_VERTICAL_TOLERANCE')
    expect(sidebarSource).toContain('onPointerDown={startHiddenSwipe}')
    expect(sidebarSource).toContain('onMouseDown={startHiddenMouseSwipe}')
    expect(sidebarSource).toContain('const nextWidth = clampSidebarWidth(dragState.width)')
    expect(sidebarSource).toContain('setWidth(nextWidth)')
    expect(sidebarSource).toContain('rawWidth <= HIDDEN_EDGE_HIT_WIDTH')
    expect(sidebarSource).toContain("title={locale === 'zh' ? '显示侧边栏，或从左向右滑出'")
    expect(sidebarSource).toContain('h-screen w-10 touch-none')
  })

  it('ignores pre-compact and undersized sidebar width cache when rendering the default expanded sidebar', () => {
    localeStorage.set('firefly-sidebar-width', '296')
    localeStorage.set('firefly-sidebar-expanded-width', '296')
    localeStorage.set('firefly-sidebar-expanded-width-v2', '245')
    localeStorage.set('firefly-sidebar-expanded-width-v3', '245')
    localeStorage.set('firefly-sidebar-expanded-width-v4', '296')
    localeStorage.set('firefly-sidebar-expanded-width-v5', '296')
    localeStorage.set('firefly-sidebar-expanded-width-v6', '168')
    localeStorage.set('firefly-sidebar-expanded-width-v7', '296')

    const markup = renderWorkspace('light')

    expect(markup).toContain('style="width:220px"')
    expect(markup).not.toContain('style="width:296px"')
  })

  it('renders workspace support copy in English when locale is en', () => {
    setLocale('en')
    const markup = renderWorkspace('light')

    expect(markup).toContain('Clinical Notes')
    expect(markup).not.toContain('Verified by AI Agent')
    expect(markup).toContain('Missing information:')
    expect(markup).not.toContain('仍待补充：')
  })

  it('renders workspace support copy in Chinese when locale is zh', () => {
    setLocale('zh')
    const markup = renderWorkspace('light')

    expect(markup).toContain('临床备注')
    expect(markup).not.toContain('AI 验证状态')
    expect(markup).not.toContain('未开始验证')
    expect(markup).toContain('待补充：')
    expect(markup).not.toContain('Clinical Notes')
  })


})
