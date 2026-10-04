<!--
 * [INPUT]: 依赖 2026-09-02 全仓审计（前端 src/ 与后端 supabase/functions/.github 三方盘点）、docs/products/product-priority-roadmap.md、openspec/specs/ baseline、AGENTS.md 架构现状，以及 2026-09-02 用户指令（SaaS 专业化、可测试性、CI/CD 完善、设计语言与登录界面优化、计费接入）。
 * [OUTPUT]: 对外提供 SaaS 专业化重构的分阶段计划：每阶段目标、任务、验证命令、commit 切分与回滚边界，并列出必须由产品负责人决策的事项。
 * [POS]: docs/products 的历史 SaaS 专业化阶段记录；当前 17 项交付状态及执行边界以 saas-acceptance.md 和活动 OpenSpec 合同为准。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 -->

# SaaS 专业化重构计划（refactor/saas-professionalization）

> 历史执行记录（2026-09-02）：Phase 0-13 全部完成，共 16 个 commit；Phase 12 为 Stripe-ready 基座（未接真实密钥），llm-proxy 的 plan 权益门控延后；决策点 D1-D6 见文末，待产品负责人确认。

## 2026-09-12 本地实现增量

`improve-clinical-workflows` 修复症状/随访归属、编辑载荷、零行写入和日期边界，新增最新指标/随访 RPC，完善表单恢复、患者导航、摘要一致性、病历阅读顺序与八色 V3 可读性。变更按一个完成单元提交；检查和迁移顺序见 `docs/operations/clinical-workflow-release.md`。本条只描述本地代码，不代表 GitHub 已同步或生产已部署。V4、真实计费、模型策略和微信上线不在该变更范围。

## 目标

把「一页萤屿」从功能完备的 MVP 提升为完善、可用、专业的 SaaS 产品，三条主线：

1. **工程可靠性**：测试可测试性、覆盖率、CI/CD 门禁、可观测性。
2. **产品完整性**：账户体系、数据导出/删除、配额、计费基座、i18n 收尾。
3. **设计专业性**：在 V3 生产真源范围内打磨设计语言与登录界面（不擅自迁移 V4）。

执行纪律：每个阶段一次或多次 commit；每次 commit 前必须 `npm run test && npm run lint && npm run type-check && npm run build` 全绿；行为变更同步 `openspec/specs/`；结构性变更同步受影响的 `AGENTS.md`。

## 现状审计结论（2026-09-02）

**优势（保持，不推倒）**：零 `any` 严格类型、服务层边界干净（组件无裸 Supabase 查询）、全部表有 owner RLS、用户 LLM 密钥 AES-GCM 服务端加密、WeChat 适配器 PKCE + 一次性 code + fail-closed、密钥从未入库、46 个测试文件 372 个测试全绿。

**核心欠账（本轮目标）**：

| 领域 | 现状 | 欠账 |
| --- | --- | --- |
| 可靠性 | 无全局 ErrorBoundary，渲染崩溃白屏 | 错误边界 + 降级 UI |
| 数据层 | 10 处手写 `{data,error,isLoading}` 样板 | 共享异步数据 hook |
| 测试 | 源码合同 + 静态渲染，无 DOM 交互测试；展示组件几乎零覆盖；无覆盖率统计 | DOM 测试环境 + 覆盖率 + 关键组件测试 |
| CI/CD | CI 门禁全；CD 只 build 不测；无 Supabase 自动化；无 Dependabot | CD 测试门禁、functions 部署工作流、依赖更新 |
| SaaS 基座 | 无 profiles、无订阅/配额/账单表、无账户设置页 | profiles + 设置页 + 配额 + 计费基座 |
| 隐私合规 | 无数据导出、无账户删除 | 导出 + 删除（RLS 自服务路径） |
| 限流 | llm-proxy 仅进程内 Map（per-isolate，重启即失效）；OCR 无限流 | 持久化限流 + 模型白名单 |
| 安全头 | 有 XFO/nosniff/Referrer-Policy，缺 CSP/HSTS | 补齐 |
| 可观测性 | 零错误上报、零结构化日志 | env 门控上报钩子 + 边缘函数日志 |
| i18n | 84 处内联 `locale === 'zh'` 三元、auth 消息中文写死 | 收敛进 copy.ts |
| 设计 | V3 生产 / V4 评估待选；构建有 >500kB chunk 警告 | V3 范围内打磨 + three.js 分包 |

## 阶段计划

### Phase 0 · 仓库卫生

- `.gitignore` 补充本地 scratch（`.playwright-cli/`、`work/`、QA 截图模式）。
- 验证：`git status` 干净；全绿命令。
- Commit: `chore(repo): ignore local scratch artifacts`

### Phase 1 · 可靠性与安全头

- 全局 `ErrorBoundary`（class 组件），lazy 路由 crash 显示可恢复降级 UI（双语文案 + 重载按钮），Dev 模式保留错误细节。
- `public/_headers` 增加 CSP（Supabase/Cloudflare 域名白名单 + `unsafe-inline` 兜底，随实际内联样式收敛）与 HSTS。
- 验证：新 ErrorBoundary 合同测试；build 后 `_headers` 进 dist。
- Commit: `feat(app-shell): add global error boundary`、`feat(security): add CSP and HSTS response headers`

### Phase 2 · 共享异步数据层

- 新增 `src/lib/async-resource.ts`：`useAsyncResource`（load/reload/error/isLoading + 竞态守卫）与 `useAsyncTask`（一次性动作）。
- 逐页替换 10 处手写样板（workspace、record、analytics、shared-record、auth-callback、llm settings），语义不变。
- 验证：hook 单测 + 现有页面合同测试全部保持绿色。
- Commit: `refactor(lib): introduce shared async resource hook` + 每页替换 `refactor(routes): adopt async resource hook in <page>`

### Phase 3 · 测试基建

- devDependencies 增加 `@testing-library/react`、`@testing-library/user-event`、`@testing-library/jest-dom`、`happy-dom`、`@vitest/coverage-v8`。
- 新增 `vitest.config.ts`：projects 分层（默认 node 环境跑合同测试；`*.dom.test.tsx` 用 happy-dom），保留现有零配置兼容性。
- `package.json` 增加 `test:watch`、`test:coverage`；覆盖率报告进 `coverage/`（gitignore）。
- 验证：现有 372 测试不变绿变红；一个 demo DOM 测试跑通。
- Commit: `test(infra): add vitest projects with DOM environment and coverage`

### Phase 4 · CI/CD 完善

- `cd.yml`：deploy 前强制 lint + type-check + test（当前只 build）。
- 新增 `.github/workflows/supabase-deploy.yml`：手动 dispatch，gate 在 `SUPABASE_ACCESS_TOKEN` secret 存在时才执行 functions deploy + migrations push；secret 缺失时 skip 并提示（本地 runbook 仍为兜底）。
- 新增 `.github/dependabot.yml`（npm + github-actions，周更）。
- CI 上传覆盖率产物 artifact。
- 验证：workflow YAML lint（actionlint 或结构自检）；不依赖真实 secret 的 dry-run。
- Commit: `ci(release): gate deploy on full verification`、`ci(supabase): add optional functions deploy workflow`、`ci(deps): add dependabot`

### Phase 5 · 关键组件测试补齐

- DOM 测试：`auth-card`（表单切换/校验/提交态）、`privacy-gate`（同意持久化）、`sidebar-nav`（导航/角色态）、`ErrorBoundary`（crash 恢复）。
- 展示组件 smoke：`record-dossier`、`report-preview-frame` 各补关键渲染断言。
- 验证：`test:coverage` 产出基线数字并记录在本文件附录。
- Commit: `test(components): cover auth card, privacy gate, sidebar and error boundary`

### Phase 6 · SaaS 数据基座（profiles + 账户设置）

- Migration `007_profiles.sql`：`profiles`（user_id FK → auth.users on delete cascade，display_name、locale、theme、created_at/updated_at，RLS owner 全权，`security definer` 触发器为新用户自动建档）。
- `/settings` 账户设置页：昵称、界面语言、主题偏好（与现有 ThemeProvider/LocaleProvider 打通）、登录邮箱展示。
- 侧栏加入口；OpenSpec 新增 `add-account-profiles` change 记录行为。
- 验证：migration SQL 合同测试（参照 `llm-provider-settings.test.ts` 模式）+ 设置页 DOM 测试。
- Commit: `feat(db): add profiles table with auto-provision trigger`、`feat(settings): add account settings page`

### Phase 7 · 隐私合规（导出 + 删除）

- 数据导出：`/settings` 一键导出全部 RLS 数据（patients/treatment_lines/lab_results/lab_report_batches/llm_provider_settings 元数据）为 JSON 下载。
- 账户删除：`security definer` RPC `delete_own_account()`（校验 `auth.uid()` 后删 `auth.users` 行，FK cascade 清数据），删除前二次确认 + 输入确认词；不引入 service role key（保持仓库零 service-role 姿态），权衡记录在 change design。
- 隐私页同步说明导出/删除路径。
- 验证：RPC SQL 合同测试 + 导出函数单测 + 设置页 DOM 测试。
- Commit: `feat(privacy): add data export`、`feat(privacy): add self-service account deletion`

### Phase 8 · 配额体系

- Migration `008_usage_ledger.sql`：`usage_events`（user_id、kind、meta、created_at）+ 当日用量视图；RLS owner 只读，insert 仅限 `service_role`（edge function 用 anon + 自校验 JWT 后以 `service_role` 写？——不引入 service role 的替代：由 edge function 通过 `security definer` RPC `record_usage(text, jsonb)` 写入）。
- llm-proxy / medical-document-ocr 限流改为「持久化用量表 + 进程内兜底」双层：表不可用时降级现有行为，不 fail-closed 破坏可用性。
- llm-proxy 增加模型白名单（每 provider 允许模型前缀/精确名单，env 可覆盖），`custom_openai` 维持用户自填。
- 验证：handler 测试扩展（限额命中 429、白名单拒绝、降级路径）。
- Commit: `feat(quota): persist usage ledger`、`feat(llm-proxy): enforce model allowlist`

### Phase 9 · 可观测性

- 前端：env 门控错误上报（`window.onerror` + `unhandledrejection` → `VITE_ERROR_REPORT_URL`，无配置即关闭；数据脱敏：不发送路由参数/表单内容）。
- Edge functions：统一 `log(level, event, meta)` 结构化输出（JSON line），替换静默失败路径。
- 不绑定 Sentry 等具体厂商（决策点 D3），接口保持通用。
- 验证：上报开关单测（开/关/缺配置）。
- Commit: `feat(observability): add env-gated error reporting and structured function logs`

### Phase 10 · i18n 收尾

- auth 全部反馈消息迁入 `copy.ts`；privacy-gate 标题/按钮双语化。
- 内联三元 Top 3（`report-preview-frame`、`auth-card`、`record-page`）迁入 copy 层；不追求一次清零，建立「新增文案必须进 copy.ts」约束。
- 验证：现有合同测试 + copy 完整性测试（新增 zh/en key 成对断言）。
- Commit: `fix(i18n): localize auth feedback and gate copy`

### Phase 11 · 设计语言与登录界面打磨（V3 范围，含单强调色主题系统）

- **单强调色主题系统**（2026-09-02 新增需求）：把当前散落的 accent 色值（`#E85D2A` / `#FF4A1C` / success 绿 / 表面色）收敛为单一强调色 token 体系——`--ff-accent-primary` 为唯一强调色，dark/light 双主题从同一强调色派生；清理组件层的硬编码色值与冗余 `theme === 'dark'` 分支，V3 DESIGN.md 同步 token 变更。
- three.js/liquid 背景独立 chunk（消除 >500kB 主包警告），登录页懒加载策略核对。
- 登录八章故事：文案/间距/焦点环/`prefers-reduced-motion` 合同复核。
- 登录/认证路径 a11y：错误提示 `role="alert"`、焦点管理、键盘路径。
- V4 仍保持评估态，不做迁移（决策点 D4）。
- 验证：build 警告消除；登录页 DOM 测试；V3 DESIGN.md 同步。
- Commit: `refactor(theme): unify single accent color system`、`perf(login): split webgl background chunk`、`polish(login): tighten story typography and focus states`

### Phase 12 · 计费基座（按「接入 Script = Stripe」假设执行）

- Migration `009_billing.sql`：`plans`（free/pro：AI 次数、OCR 次数、分享数）、`subscriptions`（user_id、stripe_customer_id、stripe_subscription_id、status、period_end）、RLS owner 只读；默认所有用户 free plan。
- Edge function `stripe-webhook`：checkout.session.completed / subscription 更新 / 删除 → 写 subscriptions（fail-closed 校验签名；无 STRIPE_SECRET_KEY 时 503 并解释）。
- Edge function `billing-checkout`：创建 Stripe Checkout Session（env 门控，无密钥时返回 `BILLING_DISABLED`）。
- 权益消费点：llm-proxy 配额读取 entitlement（free 默认值）；前端 `/settings` 显示当前 plan；pricing UI 占位（不定价，决策点 D1）。
- 全部 Stripe 调用经 mock fetch 测试，不依赖真实密钥即可 CI。
- 验证：handler 测试（webhook 签名失败拒绝、事件幂等、free 降级）。
- Commit: `feat(billing): add plans and subscriptions schema`、`feat(billing): add stripe webhook and checkout functions`

### Phase 13 · Dashboard 页面（2026-09-02 新增需求）

- **参考优秀项目**：先调研 Linear / Vercel / Stripe / Cron 等 SaaS Dashboard 的信息架构（概览指标、快速动作、近期活动、空态设计），取其信息密度与层次原则，不抄视觉。
- **准确、精确**：Dashboard 全部卡片消费真实 Supabase 数据（病历数、最近病历、`lab_results` 最新读数与异常汇总、分享状态、AI 分析次数），禁止装饰性假数据；空态给可执行动作而不是插画废话。
- **设计感**：消费 Phase 11 的单强调色 token 体系与 V3 档案视觉语言；路由 `/dashboard` 作为登录后默认落点（`/` 重定向调整），保留 `/app` 工作台。
- 侧栏 Dashboard 入口；OpenSpec change `add-product-dashboard` 记录行为合同。
- 验证：DOM 测试（数据渲染、空态、加载/错误态）；build 全绿。
- Commit: `feat(dashboard): add product dashboard with live record and lab overview`

### Phase 14 · 文档同步与收尾

- `CLAUDE.md`、`README.md`、`docs/products/product-priority-roadmap.md`、`docs/products/prd-implementation-status.md` 同步新能力。
- Runbook 补充「Supabase 迁移手工执行」边界。
- 最终全绿验证 + 覆盖率数字更新到附录。
- Commit: `docs(architecture): sync saas refactor baseline`

## 必须由产品负责人决策的事项（执行期间不阻塞）

- **D1 · 定价与计费通道**：本轮按「接入 Script = Stripe」假设搭建计费基座（如果你指的是其他服务/广告脚本/统计脚本，基座接口不变，替换 provider 即可）。价格档位、免费额度具体数值、是否支持支付宝/微信支付（Stripe 中国区限制）待定。
- **D2 · profiles 桥接 auth.users 删除**：账户删除采用 security definer RPC 删 `auth.users`（级联清数据），零 service role key。若你更倾向 edge function + service role（Supabase 官方推荐），迁移成本约半天。
- **D3 · 错误上报厂商**：接口已通用化（env 门控 HTTP 上报），选 Sentry / 自建 / 国内服务由你定；定下后只需一个 DSN + 转发层。
- **D4 · V3/V4 设计方向**：本轮只在 V3 范围内打磨；V4 Clinical Calm 是否转正需要你明确选择，转正走独立 OpenSpec 迁移 change。
- **D5 · Supabase 部署自动化 secret**：`SUPABASE_ACCESS_TOKEN` 与 project ref 需要你配置到 GitHub secrets；缺失时工作流自动跳转手动 runbook。
- **D6 · 微信登录上线**：适配层代码已就绪，需要微信开放平台企业资质 + 回调域名配置才能从「敬请期待」转为可用。

## 风险与回滚

- 每阶段独立 commit，任一阶段回滚不影响其余；migrations 幂等（`if not exists` + `drop policy if exists`）。
- 数据层替换（Phase 2）严格保持现有语义，页面合同测试是回归护栏。
- billing/observability 全部 env 门控，无配置时行为与现状完全一致，不会破坏未配置环境的部署。
