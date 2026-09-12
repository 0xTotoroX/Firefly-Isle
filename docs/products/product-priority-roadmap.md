<!--
 * [INPUT]: 依赖 docs/products/prd-implementation-status.md 的 v1.4.0+P0+Demo+PWA+Capacitor 工作树实现盘点，依赖 openspec/specs/ 的 baseline 行为，并参考 openspec/changes/archive/2026-05-16-* 的 P0/Demo/PWA/Capacitor 归档证据。
 * [OUTPUT]: 对外提供当前 P0 落地状态、下一阶段产品能力优先级、排序理由与推荐 OpenSpec 切分。
 * [POS]: docs/products 的产品路线图排序文件，区别于 PRD 实现状态盘点，负责回答“P0 已推进到哪、下一步先做什么”。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 -->

# 产品优先级路线图

## 2026-09-12 完成的本地修正

临床工作流的归属权限、随访编辑、最新状态、日期口径、表单恢复、摘要一致性与 V3 可读性已纳入 `improve-clinical-workflows`。后续发布需先执行追加数据库迁移，并在目标环境验证登录后的真实 CRUD；本轮未执行远端发布。下面保留早期路线图，不能把历史版本号当作当前线上状态。

## 当前基准

- 当前发布基线：`v1.4.0` / `2a1bd34`。
- 当前归档状态：`add-lab-analytics-page`、`add-clinical-ai-analysis`、`add-secure-record-sharing`、`restore-minimal-timeline-table-view`、`make-demo-mode-cover-full-product`、`add-cross-platform-pwa-foundation`、`add-capacitor-mobile-shell` 已归档进 `openspec/changes/archive/2026-05-16-*`，行为已并入 baseline specs。
- 当前验证：以本轮最终验证命令为准；P0 聚焦验证已覆盖 AI 分析、分享、record page 视图切换与 app route 合同。
- 当前产品事实：网页端统计入口、实验室报告摄入、`lab_results` 趋势视图、公开全产品 Demo、对话式修改、治疗甘特图、用户 LLM provider 设置、AI 辅助分析、授权码只读分享、极简 TimelineTable 视图、PWA foundation 和 Capacitor iOS/Android 本地壳基线都已落地；下一步从“可分析、可协作、可一页讲清”进入真实用户配置、发布前打磨与真实设备验收。

## 排序原则

- 先把已实现的数据能力变成用户看得见的产品入口，再扩展 AI 分析与协作。
- 先做能提高治疗信息可信度、可读性和复用率的能力，再做情绪化、社区化或平台化能力。
- 单一真相源优先：实验室趋势最终落到 Supabase `lab_results`，不复制到 `treatmentLines`；统计页面只从结构化实验室读数计算视图、图表和监测提示，不持久化第二套趋势结论。
- 已归档的 change 不再拆成新需求重复实现；新需求只消费 baseline specs 暴露出的 PatientRecord、`lab_results` 与页面入口。

## 已完成里程碑

- `add-record-treatment-gantt-view`：已完成并归档，当前 baseline 为 `/record/:id` 档案 / 甘特图切换。
- `add-medical-document-ocr`：已完成并归档，当前 baseline 为图片 / PDF OCR、文本确认与现有提取链路复用。
- `add-lab-result-trends`：已完成并归档，当前 baseline 为 `labResults` 数据结构、持久化、基础趋势表与非诊断持续增高提示。
- `add-conversational-record-editing`：已完成并归档，当前 baseline 为已有记录自然语言编辑和字段级 merge。
- `add-user-llm-provider-settings`：已完成并归档，当前 baseline 为系统 DeepSeek、用户 preset / custom provider、服务端加密与 RLS 隔离。
- `add-lab-analytics-page`：已完成并归档，当前 baseline 为 `/app` 病历 / 检验报告文件输入、`/analytics/:id` 统计入口、`/analytics/demo` 演示统计页、`lab_report_batches` 批次能力、分组趋势图、等价数据表、最近异常汇总与肿瘤标志物连续上涨提醒。
- `add-cross-platform-pwa-foundation`：已完成并归档，当前 baseline 为 Web App Manifest、隐私优先 service worker、离线/弱网提示、移动 safe-area、SPA 深链路 fallback 与平台验证矩阵。
- `add-capacitor-mobile-shell`：已完成本地壳基线，当前 baseline 为 Capacitor 8 iOS/Android 工程、固定 app id、mobile sync/open scripts、签名秘密忽略边界与操作验证文档；商店签名和发布仍是后续独立 change。

## P0 本轮完成（已归档）

1. AI 助理分析治疗方案和血液指标
   - 状态：已接入 `/record/:id` dossier，使用 `chat()` / `llm-proxy` / provider 设置边界生成非诊断 JSON 分析。
   - 边界：只做辅助解释，不给确定诊断、治疗指令或用药建议；没有实验室趋势时降级为治疗线摘要。
   - Change：`add-clinical-ai-analysis`

2. 加密分享 / 授权码分享
   - 状态：已新增 `record_shares`、授权码 hash、可撤销/可过期分享入口和公开只读 `/share/:code` 路由。
   - 边界：授权码明文只展示一次；公开访问只读单份记录，不暴露原始 user id，不接入编辑、导出或 AI 分析动作。
   - Change：`add-secure-record-sharing`

3. 一页极简表格 / TimelineTable 回归主链路
   - 状态：已把 `/record/:id` 和 `/record/demo` 的视图切换扩展为 dossier / 极简表格 / Gantt 三态。
   - 边界：复用现有 `PatientRecord` 与 `TimelineTable`，不复制第二套治疗线编辑逻辑；PDF / PNG 导出仍归 dossier。
   - Change：`restore-minimal-timeline-table-view`

4. Demo 覆盖完整产品功能
   - 状态：已新增登录页 `查看 Demo` 与公开 `/demo` 入口，Demo 病历和 Demo 统计复用同一患者与 `labResults`，每个 Demo 页面显示模式提醒，并展示 AI 分析预览、分享预览、TimelineTable、Gantt 与导出入口。
   - 边界：真实登录或匿名用户的 `/app` 仍为空白工作区；Demo 可配置 `VITE_DEMO_RECORD_SHARE_CODE` 通过只读授权码读取 Supabase 演示病历，但不默认创建患者、实验室读数或 record_shares，也不调用真实 LLM；分享码缺失、失效或读回数据不完整时使用本地完整 fixture。
   - Change：`make-demo-mode-cover-full-product`

## P1 重要但不抢主链路

5. 微信登录
   - 价值：中国用户真实测试前值得补；当前 Cloudflare Pages Functions 适配层已有预工作。
   - 边界：必须完成微信开放平台、Supabase provider、回调域名与 session 恢复 live verification 后才能从“敬请期待”变为可点击。

6. 手机验证码
   - 价值：中国用户友好。
   - 边界：需要短信服务、成本、风控、滥用防护和测试手机号策略，不应半接入。

7. MSD 健康查询
   - 价值：有参考意义，但属于外部内容入口，不是当前病历主骨架。

## P2 暂缓

8. 每日鼓励语、许愿墙、拥抱动画欢迎页
   - 原因：能增加温度，但当前阶段不如 AI 分析、受控分享和一页极简表格重要。

9. 桌面壳 / 小程序 / 鸿蒙原生版本
   - 原因：PWA foundation 先解决安装、弱网、移动 Web 和 installed shell；Capacitor iOS/Android 已有本地壳基线但还未进入商店发布，Tauri/Electron 桌面壳、小程序和鸿蒙原生必须作为后续独立 change，不能和 PWA foundation 混成一次重写。

10. OpenClaw / WebChrome 扩展集成
    - 原因：除非确定为获客或固定工作流入口，否则会分散核心架构注意力。

## 推荐执行顺序

1. `add-wechat-auth`
2. `add-phone-otp-auth`
3. 真实用户试用前的分享安全审计与可用性打磨。

统计入口已经从“藏在档案页里的能力”变成网页端主入口，文件上传回到 `/app` 输入区统一承接；P0 又补上 AI 分析、受控分享和一页极简表格回归。下一步不应再扩散新主线，应先做真实配置验证、分享安全审计和发布前可用性打磨。

## OpenSpec 切分建议

- `add-clinical-ai-analysis` 只做分析生成、展示、免责声明与失败态，不顺手做分享或新上传入口。
- `add-secure-record-sharing` 只做只读授权与撤销，不把协作编辑、评论、医生账户体系塞进第一版。
- `restore-minimal-timeline-table-view` 只复用已有 `TimelineTable` 与 PatientRecord，不复制第二套治疗线编辑逻辑。
- `make-demo-mode-cover-full-product` 只做公开 Demo 演示、教程和调试入口，不自动把 Demo 写入真实用户工作区；后续“载入 Demo 到我的工作区”应拆成独立 sandbox change。
- `add-wechat-auth` 必须以真实微信开放平台配置和回调验证为准；缺配置时保留可解释失败，不伪装可用。
- `add-cross-platform-pwa-foundation` 已完成归档；`add-capacitor-mobile-shell` 已建立本地 iOS/Android shell 基线，下一阶段若继续移动端，应拆成真实设备验收、签名/TestFlight/Google Play 或平台深链路 change，不重写 React UI 或医疗数据模型。
