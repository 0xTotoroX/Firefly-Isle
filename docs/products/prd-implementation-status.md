<!--
 * [INPUT]: 依赖 docs/products/archive/prd.md、openspec/specs/、src/、supabase/、functions/、public/、mobile/、v1.4.0 发布基线，以及 openspec/changes/archive/2026-05-16-* 的 P0/Demo/PWA/Capacitor 归档证据。
 * [OUTPUT]: 对外提供 PRD 功能的已实现、部分实现、未实现与额外能力盘点。
 * [POS]: docs/products 的当前产品状态真相源，连接历史 PRD 快照、baseline specs 与运行时代码现实。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 -->

# PRD 实现状态盘点

## 2026-09-12 本地增量

Dashboard、症状日志和随访已形成患者内导航；本轮修复 owner 归属、编辑保存、日历日期、摘要范围、当前状态查询和错误恢复，并调整 V3 可读性与病历阅读顺序。追加迁移和发布门槛见 `docs/operations/clinical-workflow-release.md`。这是本地实现状态，不能据此认定生产已部署；下面的早期功能盘点保留其历史范围。

## 盘点基准

- PRD 快照：`docs/products/archive/prd.md`
- 历史发布基线（2026-05）：`v1.4.0` / `2a1bd34`；本轮未核验线上版本
- 当前规格真相源：`openspec/specs/`
- 当前 P0 / Demo / PWA / Capacitor 归档状态：`add-lab-analytics-page`、`add-clinical-ai-analysis`、`add-secure-record-sharing`、`restore-minimal-timeline-table-view`、`make-demo-mode-cover-full-product`、`add-cross-platform-pwa-foundation`、`add-capacitor-mobile-shell` 已归档到 `openspec/changes/archive/2026-05-16-*`，行为并入 `openspec/specs/`
- 实现核对范围：`src/`、`supabase/`、`functions/`、`public/`、`capacitor.config.ts`、`mobile/`
- 最近验证：以本轮最终验证命令为准；P0 聚焦验证已覆盖 AI 分析、分享、record page 视图切换与 route 合同
- 最近核对结论：核心病历闭环、/app OCR 文件输入、实验室指标结构、网页端统计页面、公开全产品 Demo、对话式修改、甘特图视图、用户 LLM provider 设置、AI 辅助分析、授权码只读分享、极简 TimelineTable 视图、PWA foundation 与 Capacitor iOS/Android 本地壳基线已进入当前实现；Electron / Tauri / React Native / Flutter / 小程序 / 鸿蒙原生壳仍未实现。

## 已实现

- 自然语言病史输入到 LLM 结构化提取：已实现，走 `chat()` -> `llm-proxy` -> Gemini / DeepSeek。
- 医学文档 OCR 输入：已实现图片 / PDF 上传、服务端 Gemini OCR、文本确认和失败不污染当前 PatientRecord。
- `PatientRecord` 数据模型：已覆盖基本信息、初发区块、多线治疗、免疫组化、基因检测与可选 `labResults`。
- 血常规、血生化、肿瘤标志物的数据结构与提取合同：已实现为独立 `labResults`，不混入 `treatmentLines`。
- 实验室指标持久化：已实现 `lab_results` 读写、索引、RLS 用户隔离与缺表降级。
- `/record/:id` 基础实验室趋势表：已有 `LabTrendsTable`，当真实记录含 `labResults` 时展示最新值、参考范围、最近日期、读数与持续增高提示。
- `/analytics/:id` 统计页面：已实现侧栏真实入口、血常规 / 血生化 / 肿瘤标志物分组、指标列表、网页端折线图、等价数据表、最近异常汇总和非诊断提示。
- 公开 Demo 模式：`/demo` 使用正式页面覆盖总览、三种完全虚构病历、录入/追问/编辑、化验队列核对、症状、随访、设置与模型预览；跨页面共享内存 CRUD，刷新或明确重置恢复。提取/OCR/AI 为标注的固定示例，分享/支付/注销/密钥不执行真实操作；PDF/PNG 本地导出。Demo 不创建或恢复 Supabase session，不读取公开分享码或真实账户偏好。
- PWA foundation：已实现 Web App Manifest、PWA 图标、移动 metadata、隐私优先 service worker、离线状态提示、safe-area 基础适配、SPA 深链路 fallback 与 PWA 验证矩阵；只缓存 app shell / 静态资产，不缓存患者数据、授权码、Supabase 私有响应、OCR 或 LLM 响应。
- Capacitor iOS / Android 本地壳：已实现 Capacitor 8 配置、固定 app id `com.ghibli1024.fireflyisle`、本地源配置应用名 `知见`、iOS/Android 平台工程、mobile sync/open scripts、签名秘密忽略边界与本地操作文档；它只包装现有 `dist` Web build，不代表 App Store、TestFlight、Google Play 或生产签名发布完成。
- `/analytics/demo` 演示统计页：已保留为受保护统计 fallback；无真实输入时推荐使用公开 `/demo/analytics` 查看演示统计。
- `/app` 文件输入：已实现病历 / 检验报告图片或 PDF 上传与 OCR 文本确认，统计页本身不再承载上传表单。
- 肿瘤标志物监测提醒：已实现连续两段上涨超过 20% 的项目扫描与网页端提醒，提示语限定为趋势提醒，不输出诊断、进展结论、用药或治疗建议。
- 最多 3 轮追问：已实现。
- 输入框中对话式修改：已实现已有记录的自然语言编辑、字段级 patch 校验、未提及字段保留、失败可重试。
- 缺失关键字段高亮：已实现。
- 手动编辑表格/预览字段并落库：已实现。
- Supabase 持久化、RLS 用户隔离、最近记录恢复：已实现。
- `/record/:id` 读取真实病历并支持 PDF / PNG 导出：已实现。
- `/record/:id` 治疗线甘特图视图：已实现档案 / 甘特图切换、缺失日期待补充、开放当前线与导出不劫持。
- `/record/:id` 极简 TimelineTable 视图：已实现档案 / 极简表格 / 甘特图三态切换，复用当前 PatientRecord 和字段级保存逻辑，不复制第二套治疗线编辑。
- `/record/:id` AI 辅助分析：已实现治疗线摘要、指标趋势摘要、复核关注点、就诊前问题、加载态、失败态、无实验室数据降级与非诊断免责声明，走现有 `chat()` / `llm-proxy` provider 边界。
- 授权码只读分享：已实现单份 record 分享创建、一次性链接展示、复制/查看、撤销、过期状态、公开 `/share/:code` 只读访问与错误/撤销/过期反馈。
- 多平台 LLM provider 设置：已实现系统默认 DeepSeek、Gemini / Claude / OpenAI / GLM / DeepSeek / Kimi preset、自定义 OpenAI 风格 provider、服务端加密存储与非明文回读。
- 中英双语：已实现。
- 背景音乐：已实现本地授权歌单控件，但不是 PRD 写的《Just One Dance》。

## 部分实现 / 有偏差

- 实验室趋势归档状态：`/record/:id` 保留基础趋势表，`/analytics/:id` 已承接主统计入口；统计页和实验室摄入合同已并入 baseline specs。
- 微信登录：Cloudflare Pages Functions 适配层已写，前端仍显示“敬请期待”，不会启动真实微信 OAuth。
- 手机验证码：只有占位，未接短信服务。
- 上传 / 语音入口：`/app` 文件导入已升级为病历 / 检验报告 OCR；语音仍为“暂未开放”。

## 未实现

- MSD 健康查询。
- Windows / Mac 桌面包、小程序、鸿蒙原生或全平台重写。
- OpenClaw / WebChrome 扩展集成。
- 许愿墙。
- 每日鼓励语。
- PRD 描述的“拥抱动画 + 鼓励语欢迎页”。

## 额外已做但 PRD 未明确列出

- 邮箱登录、注册、重置密码、匿名登录、Google 登录。
- 隐私门控和 `/privacy` 页面。
- LLM proxy 的 JWT 校验、匿名 / 登录用户频率限制、用户 provider 设置与 DeepSeek 连通性测试。
- GitHub Actions + Cloudflare Pages 部署基线。
- 社区健康文件：`LICENSE`、`SECURITY.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`。
- 自动测试覆盖：以当前最终验证输出为准；Demo route、P0 route、分享、AI、统计与工作区合同均有回归测试覆盖。

## 关键实现入口

- `src/lib/extraction.ts`
- `src/lib/extractionPrompt.ts`
- `src/lib/medical-document-ocr.ts`
- `src/lib/lab-dictionary.ts`
- `src/lib/lab-report-ingestion.ts`
- `src/lib/lab-report-storage.ts`
- `src/lib/lab-results.ts`
- `src/lib/clinical-analysis.ts`
- `src/lib/record-sharing.ts`
- `src/lib/record-editing.ts`
- `src/lib/llm/provider-settings.ts`
- `src/routes/workspace-page.tsx`
- `src/routes/lab-analytics-page.tsx`
- `src/routes/demo-mode.logic.ts`
- `src/routes/shared-record-page.tsx`
- `src/components/analytics/demo-lab-analytics.ts`
- `src/routes/record-page.tsx`
- `src/components/analytics/lab-analytics-dashboard.tsx`
- `src/components/record/ClinicalAnalysisPanel.tsx`
- `src/components/record/LabTrendsTable.tsx`
- `src/components/record/RecordSharePanel.tsx`
- `src/components/timeline/TimelineTable.tsx`
- `src/components/timeline/TreatmentGanttView.tsx`
- `src/lib/export-record.ts`
- `supabase/migrations/001_init.sql`
- `supabase/migrations/005_lab_report_batches.sql`
- `supabase/migrations/006_record_shares.sql`
- `supabase/functions/llm-proxy/handler.ts`
- `supabase/functions/medical-document-ocr/handler.ts`
