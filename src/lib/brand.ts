/**
 * [INPUT]: 无运行时依赖；中英文产品名称与对外简介。
 * [OUTPUT]: brand 提供显示名称、简介、页面标题及下载文件名前缀。
 * [POS]: 应用品牌文案入口；不管理存储键、账号导出协议、部署或原生应用标识。
 * [PROTOCOL]: 名称、描述或使用边界变化时更新本文及对应模块说明。
 */
export const brand = {
  name: { zh: '知见', en: 'MyOncode' },
  slug: 'myoncode',
  tagline: { zh: '面向肿瘤患者与家属的全程管理工具', en: 'Cancer care management for patients and families' },
  description: {
    zh: '知见 MyOncode，整理病历与治疗时间线，追踪检验指标、副作用和随访。AI 辅助录入，重要信息由你核对。',
    en: 'MyOncode organizes medical records, treatment timelines, lab trends, side effects and follow-ups. AI assists with intake; you review the details.',
  },
  pageTitle: { zh: '知见 MyOncode · 肿瘤全程管理', en: 'MyOncode · Cancer care management' },
} as const
