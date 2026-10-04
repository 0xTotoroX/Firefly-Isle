/**
 * [INPUT]: 依赖 @/components/system 的 topbar、masthead、sidebar 导出，承载占位素材常量供页面复用。
 * [OUTPUT]: 对外提供 ClinicalTopBar、DarkTopBar、ArchiveSideNav、LightMasthead 与设计复刻所需的占位图常量。
 * [POS]: components 的薄壳层导出文件，负责复用 V3 可变侧栏与 system shell 并暴露页面所需占位素材，不再承载主题结构实现细节。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export { ArchiveSideNav, AVATAR_PLACEHOLDER } from '@/components/system/sidebar-nav'
export { LightMasthead } from '@/components/system/masthead'
export { ClinicalTopBar, DarkTopBar } from '@/components/system/topbar'

export const QR_PLACEHOLDER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCodMwGgWvuwF5LOmg917ngq1oe0WPAGBvhZreAMsUlKJvYTRJWEVO4reEpFvrks9HRlph4tMYP8n0cUIH1tr0G1iY4h8ejtcyA9YbsVggEGH8XpAXsiVtqDp_iUEs4YkP7ZBbbfvVG8Smlndbs3Pep1M4IC4QyLH2XKQ6__VO4hEqXYrsZyIviesrCk1LwAv-73YdRfFeRkZAR_YYQdbAXSNUwkXW5lO17y6apkHeyptmFTiCLefqtyyFjUSMkduWUunUTiDnmQsBc'

export const REPORT_PLACEHOLDER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC8egfpCbDKutF3Pj8yUX771rGTYNwb_Yr_nkSbp9YjObJgp5NyZ0tpUpWqt8wfssDZt9eVyaSPT0crzG3BZtKLq8CsdKamZzlaUf8FjNbBo5vF0aS2EbyfHd9musVqkWQMbO2U2INWo3g3Xd_P9_jwjyBvyuNexTF8A7wkvb3iV2bl-XSJ9C8FTEbodtoJN80B-ZwSfSgkCgVCYx7NNrtn1W4lx9CpL0avpzD3r0-y9CE3CsHsFo4nnHulDkfVwE78wG3nyoPHViia'

export const SCAN_PLACEHOLDER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBIwAaPORS3qiXqWxIzVwSRQz5zsHUdSDHZ65CVNm52sSYNPegfX4Ji6IvrRm1NgX7aLyPq5gYNfMecx0iBJzeA-ntwTRfmbkWpFuGPrSNvkd5wHt_LIWP_17YcmA-dL_OUvcpN_wp-jyn8wXiRyjF42FblzEL_6wnJCJP6GzPycv0fRjWSjwS1_xNVxzD4936hCCGE1e5cMUG1fZkc_6OiNMEcVuqgtqcGBh2RnPwBYsL21g_vcuQgUhHTWT7Q_4gojBwKUhyTIo6w'

export const PATHOLOGY_PLACEHOLDER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBOSPocHG_hrOiExe-cxT7ts-cfaH_51_OTMT3yC1yKKwz-uL9Hlo3LJiu3nw0VuEJJXmNompcIJJFyHs9k2mSDK1mXX89s0MWZufAzpQB9eSIA5NtNgz01GtD4Q8Jamod0sDj8rSbKgc3oj_TEpC6mpybF45zjJHv1mjaCi4lx9tKbgE61EG40E0ASllr-yboGCP_9DGRcrbVi7UjKTprA4xICHdDIq-tUiLYOovfAQyJ6aE1uNpix0vR1IspbLgNUIWYShgJ9pWSj'
