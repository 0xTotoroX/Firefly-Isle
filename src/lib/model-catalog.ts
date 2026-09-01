/**
 * [INPUT]: 无运行时外部依赖；目录协议字段对齐 Codex++ 模型目录（slug / display_name / description / input_modalities / priority / visibility）。
 * [OUTPUT]: 对外提供 modelCatalog、defaultTextModel、defaultImageModel 与 ModelCatalogEntry 类型。
 * [POS]: src/lib 的模型目录真相源，按「声明式目录 + 模态标注」协议收敛文字/图像默认模型；模型配置页与 OCR/LLM 边界都从这里读默认值，禁止在组件层散落模型名字面量。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type ModelModality = 'image' | 'text'

export type ModelVisibility = 'list' | 'hidden'

export type ModelCatalogEntry = {
  description: string
  displayName: string
  /** 支撑该模型的提供商边界：text 走 llm-proxy chat，image 走 medical-document-ocr。 */
  modality: 'image' | 'text'
  inputModalities: ModelModality[]
  /** 目录内排序键，小者优先；与 Codex++ 目录的 priority 语义一致。 */
  priority: number
  slug: string
  visibility: ModelVisibility
}

export const modelCatalog: ModelCatalogEntry[] = [
  {
    description: 'DeepSeek v4 Flash · 文字结构化提取与对话式修改的默认模型',
    displayName: 'DeepSeek v4 Flash',
    modality: 'text',
    inputModalities: ['text'],
    priority: 1006,
    slug: 'deepseek-v4-flash',
    visibility: 'list',
  },
  {
    description: 'DeepSeek v4 图像模型 · 病历/检验报告图片 OCR 的默认模型',
    displayName: 'DeepSeek v4 图像模型',
    modality: 'image',
    inputModalities: ['image', 'text'],
    priority: 1007,
    slug: 'deepseek-v4-image',
    visibility: 'list',
  },
  {
    description: 'Gemini 2.5 Flash · OCR 备用 provider，保留 PDF 输入能力',
    displayName: 'Gemini 2.5 Flash',
    modality: 'image',
    inputModalities: ['image', 'text'],
    priority: 1008,
    slug: 'gemini-2.5-flash',
    visibility: 'list',
  },
]

export const defaultTextModel = modelCatalog.find((entry) => entry.slug === 'deepseek-v4-flash')!
export const defaultImageModel = modelCatalog.find((entry) => entry.slug === 'deepseek-v4-image')!

export function listVisibleModels(modality?: ModelModality): ModelCatalogEntry[] {
  return modelCatalog
    .filter((entry) => entry.visibility === 'list')
    .filter((entry) => (modality ? entry.modality === modality : true))
    .sort((left, right) => left.priority - right.priority)
}
