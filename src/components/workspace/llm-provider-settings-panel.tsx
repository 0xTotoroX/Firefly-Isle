/**
 * [INPUT]: 依赖 react 的本地表单状态、@/lib/locale 的语言状态、@/lib/llm/provider-settings 的设置 API 与 DeepSeek 连通性测试、system ActionSurface 与 transitions-dev.css 的 accordion/control/tab 动效合同。
 * [OUTPUT]: 对外提供 LlmProviderSettingsPanel 组件与字段显隐纯函数，渲染整块可点击收起的系统内置 deepseek-v4-flash、API 自提供、自定义设置与 DeepSeek 服务测试入口。
 * [POS]: components/workspace 的 provider 设置区块，被 ExtractionComposer 嵌入，负责紧凑头部展开、按模式展开字段、测试系统模型连通性与保存动作但不参与正式 chat 请求。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useDemoSession } from '@/lib/demo-session'
import { useEffect, useState } from 'react'

import { ActionSurface } from '@/components/system/surfaces'
import { useLocale } from '@/lib/locale'
import {
  getLlmProviderSetting,
  resetLlmProviderSetting,
  saveLlmProviderSetting,
  testLlmProviderConnection,
  type LlmProviderId,
} from '@/lib/llm/provider-settings'

type LlmProviderSettingsPanelProps = {
  disabled?: boolean
  theme: 'dark' | 'light'
}

type LlmProviderMode = 'preset' | 'custom' | 'system'
type LlmProviderField = 'apiKey' | 'baseUrl' | 'model' | 'provider'

const visibleFieldsByMode = {
  custom: ['baseUrl', 'apiKey', 'model'],
  preset: ['provider', 'apiKey', 'model'],
  system: [],
} satisfies Record<LlmProviderMode, LlmProviderField[]>

const presetProviders: Array<{ label: string; value: Exclude<LlmProviderId, 'custom_openai'> }> = [
  { label: 'Gemini', value: 'gemini' },
  { label: 'Claude', value: 'claude' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'GLM', value: 'glm' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Kimi', value: 'kimi' },
]

export function getLlmProviderVisibleFields(mode: LlmProviderMode) {
  return [...visibleFieldsByMode[mode]]
}

export function LlmProviderSettingsPanel({ disabled = false, theme }: LlmProviderSettingsPanelProps) {
  const { locale } = useLocale()
  const demoSession = useDemoSession()?.session
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<LlmProviderMode>(() => demoSession?.getState().modelPreview.mode ?? 'system')
  const [provider, setProvider] = useState<Exclude<LlmProviderId, 'custom_openai'>>(() => demoSession?.getState().modelPreview.provider ?? 'openai')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(() => demoSession?.getState().modelPreview.baseUrl ?? '')
  const [model, setModel] = useState(() => demoSession?.getState().modelPreview.model ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (demoSession) return
    let active = true

    void getLlmProviderSetting()
      .then((setting) => {
        if (!active || setting.mode === 'system') return

        if (setting.provider === 'custom_openai') {
          setMode('custom')
          setBaseUrl(setting.baseUrl ?? '')
          setModel(setting.model ?? '')
          return
        }

        setMode('preset')
        setProvider(setting.provider)
        setModel(setting.model ?? '')
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [demoSession])

  useEffect(() => {
    demoSession?.setModelPreview({ mode, provider, baseUrl, model })
  }, [demoSession, mode, provider, baseUrl, model])

  async function saveSetting() {
    if (demoSession) { setMessage(locale === 'zh' ? '仅演示预览，未保存密钥或服务配置。' : 'Preview only. No keys or service configuration were saved.'); return }
    setSaving(true)
    setMessage(null)

    try {
      if (mode === 'system') {
        await resetLlmProviderSetting()
      } else if (mode === 'custom') {
        await saveLlmProviderSetting({
          apiKey,
          baseUrl,
          model,
          provider: 'custom_openai',
        })
      } else {
        await saveLlmProviderSetting({
          apiKey,
          model,
          provider,
        })
      }

      setApiKey('')
      setMessage(locale === 'zh' ? '模型设置已保存' : 'Provider settings saved')
    } catch {
      setMessage(locale === 'zh' ? '模型设置保存失败，请检查 API key 或自定义地址' : 'Could not save provider settings')
    } finally {
      setSaving(false)
    }
  }

  async function testProviderConnection() {
    if (demoSession) { setMessage(locale === 'zh' ? '演示不连接模型服务。' : 'Demo does not connect to model services.'); return }
    setTesting(true)
    setMessage(null)

    try {
      const result = await testLlmProviderConnection()
      setMessage(locale === 'zh' ? `DeepSeek 服务已接通：${result.model}` : `DeepSeek service connected: ${result.model}`)
    } catch {
      setMessage(locale === 'zh' ? 'DeepSeek 服务未接通，请稍后重试或切换 API 自提供。' : 'DeepSeek service is not reachable. Retry later or bring your own API.')
    } finally {
      setTesting(false)
    }
  }

  const copy = locale === 'zh'
    ? {
        apiKey: 'API Key',
        baseUrl: 'Base URL',
        collapse: '收起模型设置',
        custom: '自定义',
        disclosure: '医疗记录内容会发送到你选择的第三方模型服务商。',
        expand: '展开模型设置',
        model: '模型名',
        preset: 'API 自提供',
        provider: 'Provider',
        save: saving ? '保存中...' : '保存模型设置',
        system: '系统内置（deepseek-v4-flash）',
        test: testing ? '测试中...' : '测试 DeepSeek 服务',
        title: '模型设置',
      }
    : {
        apiKey: 'API Key',
        baseUrl: 'Base URL',
        collapse: 'Collapse model settings',
        custom: 'Custom',
        disclosure: 'Medical record content is sent to the third-party model provider you choose.',
        expand: 'Expand model settings',
        model: 'Model',
        preset: 'Bring your API',
        provider: 'Provider',
        save: saving ? 'Saving...' : 'Save Provider Settings',
        system: 'Built-in system (deepseek-v4-flash)',
        test: testing ? 'Testing...' : 'Test DeepSeek Service',
        title: 'Model Settings',
      }
  const providerLabel = presetProviders.find((option) => option.value === provider)?.label ?? provider
  const selectedModeLabel = mode === 'system' ? copy.system : mode === 'custom' ? copy.custom : `${copy.preset} · ${providerLabel}`
  const toggleLabel = expanded ? copy.collapse : copy.expand
  const visibleFields = getLlmProviderVisibleFields(mode).filter((field) => !demoSession || field !== 'apiKey')
  const fieldControls: Record<LlmProviderField, JSX.Element> = {
    apiKey: (
      <label className="grid gap-1 text-xs font-semibold text-[var(--ff-text-muted)]">
        {copy.apiKey}
        <input
          autoComplete="off"
          className="h-11 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 text-sm text-[var(--ff-text-primary)]"
          disabled={disabled || saving}
          name="llm-provider-api-key"
          onChange={(event) => setApiKey(event.target.value)}
          type="password"
          value={apiKey}
        />
      </label>
    ),
    baseUrl: (
      <label className="grid gap-1 text-xs font-semibold text-[var(--ff-text-muted)]">
        {copy.baseUrl}
        <input
          className="h-11 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 text-sm text-[var(--ff-text-primary)]"
          disabled={disabled || saving}
          name="llm-provider-base-url"
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="https://api.example.com/v1"
          type="url"
          value={baseUrl}
        />
      </label>
    ),
    model: (
      <label className="grid gap-1 text-xs font-semibold text-[var(--ff-text-muted)]">
        {copy.model}
        <input
          className="h-11 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 text-sm text-[var(--ff-text-primary)]"
          disabled={disabled || saving}
          name="llm-provider-model"
          onChange={(event) => setModel(event.target.value)}
          placeholder="model-name"
          value={model}
        />
      </label>
    ),
    provider: (
      <label className="grid gap-1 text-xs font-semibold text-[var(--ff-text-muted)]">
        {copy.provider}
        <select
          className="h-11 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 text-sm text-[var(--ff-text-primary)]"
          disabled={disabled || saving}
          name="llm-provider-provider"
          onChange={(event) => setProvider(event.target.value as Exclude<LlmProviderId, 'custom_openai'>)}
          value={provider}
        >
          {presetProviders.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    ),
  }

  return (
    <div data-llm-provider-settings="true">
      <ActionSurface className="mt-4 overflow-hidden p-0" theme={theme} tone="panel">
        <div className="flex flex-col">
          <button
            aria-controls="llm-provider-settings-body"
            aria-expanded={expanded}
            aria-label={toggleLabel}
            className="t-control-press flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--ff-surface-soft)] focus-visible:bg-[var(--ff-surface-soft)] focus-visible:outline-none sm:px-4"
            data-llm-provider-settings-toggle="true"
            onClick={() => setExpanded((value) => !value)}
            title={toggleLabel}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="material-symbols-outlined text-xl text-[var(--ff-text-primary)]">model_training</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="font-[var(--ff-font-display)] text-base font-bold tracking-normal text-[var(--ff-text-primary)] sm:text-lg">{copy.title}</h3>
                  <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-xl text-[var(--ff-text-secondary)]">{expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                </div>
                <p className="truncate text-xs font-semibold text-[var(--ff-text-secondary)] sm:text-sm">{selectedModeLabel}</p>
              </div>
            </div>
          </button>

          <div aria-hidden={!expanded} className="t-accordion grid gap-4 px-3 pb-3 sm:px-4" hidden={!expanded} id="llm-provider-settings-body">
            {demoSession ? <p className="text-sm text-[var(--ff-text-secondary)]">{locale === 'zh' ? '仅供预览：不读取真实配置，不提供密钥输入，也不连接模型服务。' : 'Preview only: no account configuration, key entry, or model connections.'}</p> : null}
            <div className="t-tab-switch grid gap-2 text-sm text-[var(--ff-text-secondary)] md:grid-cols-3">
              <label className="flex min-h-11 items-center gap-2 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-3">
                <input checked={mode === 'system'} disabled={disabled || saving} name="llm-provider-mode" onChange={() => setMode('system')} type="radio" />
                {copy.system}
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-3">
                <input checked={mode === 'preset'} disabled={disabled || saving} name="llm-provider-mode" onChange={() => setMode('preset')} type="radio" />
                {copy.preset}
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-3">
                <input checked={mode === 'custom'} disabled={disabled || saving} name="llm-provider-mode" onChange={() => setMode('custom')} type="radio" />
                {copy.custom}
              </label>
            </div>

            {visibleFields.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {visibleFields.map((field) => <div key={field}>{fieldControls[field]}</div>)}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold leading-5 text-[var(--ff-accent-warning)]">{copy.disclosure}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  className="t-control-press inline-flex h-10 items-center justify-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)] disabled:cursor-not-allowed disabled:opacity-60"
                  data-llm-provider-test="true"
                  disabled={Boolean(demoSession) || disabled || saving || testing}
                  onClick={() => void testProviderConnection()}
                  type="button"
                >
                  {copy.test}
                </button>
                <button
                  className="t-control-press inline-flex h-10 items-center justify-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(demoSession) || disabled || saving || testing}
                  onClick={() => void saveSetting()}
                  type="button"
                >
                  {copy.save}
                </button>
              </div>
            </div>

            {message ? <div className="text-sm font-semibold text-[var(--ff-text-secondary)]" role="status">{message}</div> : null}
          </div>
        </div>
      </ActionSurface>
    </div>
  )
}
