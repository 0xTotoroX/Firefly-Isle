/**
 * [INPUT]: 无运行时外部依赖，只承载隐私文案、独立隐私页路由与本地确认 key。
 * [OUTPUT]: 对外提供隐私页 href、隐私门控存储 key、摘要文案与条目列表。
 * [POS]: lib 的隐私真相源，为首次门控与独立隐私页提供同一份文本基础。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export const PRIVACY_PAGE_HREF = '/privacy'

export const PRIVACY_ACCEPTED_STORAGE_KEY = 'privacy_accepted'

export const PRIVACY_POLICY_SUMMARY =
  '继续使用即表示您理解病历文本会被保存到受访问控制的云端工作区，仅授权给当前会话访问。'

export const PRIVACY_POLICY_ITEMS = [
  {
    body: '输入的病史文本、结构化结果与后续编辑内容会保存到当前会话对应的受限数据空间，用于恢复工作进度。',
    title: '数据用途',
  },
  {
    body: '邮箱账户与匿名会话都会获得独立 uid，数据库访问由 Supabase Auth 与 RLS 隔离控制，其他用户无法直接读取。',
    title: '访问边界',
  },
  {
    body: '匿名模式仍然是云端会话，不是纯本地存储；如果浏览器清除了本地会话，匿名用户可能失去对既有数据的访问。',
    title: '匿名模式说明',
  },
] as const
