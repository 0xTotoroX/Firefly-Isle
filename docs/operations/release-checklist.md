<!--
[INPUT]: 依赖 README、docs/operations/supabase/README.md、当前 MVP 导出链路与 OpenSpec 11.4 / 11.5 要求。
[OUTPUT]: 提供 Firefly-Isle 上线前浏览器导出验收与 Supabase 安全/可用性复核清单。
[POS]: docs/operations 的发布检查 runbook，给 Commit 11 和正式发布前手动复核使用。
[PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-->

# Firefly-Isle 发布前检查清单

这份清单只服务于一件事：在真正发布 MVP 前，把 11.4 / 11.5 要求变成可重复执行的人工复核步骤。

## 1. 导出跨浏览器验收（11.4）

当前 MVP 的目标浏览器最低要求：

- Chrome（必验）
- Safari（必验）

如果后续发布范围扩大，再补：

- Firefox
- Edge

### 1.1 Chrome 验收项

- 登录 / 匿名进入后可进入 `/app`
- 输入病史后可完成提取、追问、渲染
- inline edit 保存后刷新仍能恢复
- PNG 导出成功，文件名符合 `firefly-{YYYY-MM-DD}.png`
- PDF 导出成功，文件名符合 `firefly-{YYYY-MM-DD}.pdf`
- 导出失败时能看到用户可读错误提示，而不是静默失败

**当前执行结果（2026-04-13, production）**

- `https://firefly.ghibli1024.com` 与 `https://firefly-isle.pages.dev` 均可访问
- 匿名进入成功，可进入 `/app`
- 生产环境提取 → 渲染 → 落库通过
- inline edit 保存后刷新恢复通过
- PNG 导出触发下载，文件名为 `firefly-2026-04-13.png`
- PDF 导出已生成 `application/pdf` blob，文件名为 `firefly-2026-04-13.pdf`

### 1.2 Safari 验收项

按 Chrome 同一套流程复验以下项目：

- `/app` 主链路可用
- PNG 导出成功
- PDF 导出成功
- 失败提示可见

**当前执行结果（2026-04-13, production）**

- 匿名进入成功，可进入 `/app`
- 提取与渲染成功
- PNG 导出成功
- PDF 导出成功

### 1.3 当前已知风险

- `html2canvas` 对复杂 CSS 兼容性有限，尤其要警惕颜色函数与阴影渲染差异
- 当前 dark 时间线已避免使用会落成 `oklab(...)` 的透明色写法，以减少导出失败概率

## 2. Supabase 发布环境复核（11.5）

### 2.1 Auth

- Email provider 已开启
- Anonymous Sign-In 已开启
- Site URL 已指向当前部署域名
- Additional Redirect URLs 已包含需要的预览 / 正式域名

### 2.2 Database / RLS

- `patients` 表存在，RLS 已开启
- `treatment_lines` 表存在，RLS 已开启
- owner-only policies 仍存在
- 用两个不同会话验证：用户 A 无法看到用户 B 的 `patients` / `treatment_lines`

### 2.3 Storage

- bucket `patient-assets` 存在
- bucket 非 public
- 以不同 uid 前缀做对象访问测试，确认不能跨 uid 读取

### 2.4 Edge Function / LLM

- `llm-proxy` 已部署且状态为 ACTIVE
- `GEMINI_API_KEY` 已配置
- `DEFAULT_GEMINI_MODEL` 已配置
- `DEEPSEEK_API_KEY` 已配置，或明确记录当前发布环境暂不启用 DeepSeek
- `DEFAULT_DEEPSEEK_MODEL=deepseek-v4-flash` 已配置
- `DEFAULT_LLM_PROVIDER=deepseek` 与当前系统内置发布策略一致；如临时回滚到 `gemini`，必须记录原因
- 当前部署方式若使用 `--no-verify-jwt`，必须确认函数内部 JWT 校验仍生效
- 匿名 token 与邮箱用户 token 都可通过函数内部校验
- 若 Cloudflare Pages Git 集成构建读取 `wrangler.jsonc`，需额外确认构建期依赖的 `VITE_SUPABASE_*` 值也存在于 `wrangler.jsonc > vars`，否则线上 bundle 可能在构建时拿不到 env，即使 Dashboard UI 已填写变量。

### 2.5 核心链路手动验收

至少复核一次：

- `/login` → `/app`
- 文字输入 → 提取 → 追问 → 渲染
- inline edit 持久化
- 刷新恢复最近患者记录
- PNG / PDF 导出
- `/privacy` 独立可访问

## 3. 发布阻塞条件

以下任一项未满足，视为不能发布：

- Chrome / Safari 任一目标浏览器导出失败
- RLS 双会话隔离未通过
- Storage 跨 uid 访问仍可读
- `llm-proxy` 未部署或无法处理当前 token
- `/privacy` 页面不可访问

## Dependency maintenance

Upgrade ESLint with compatible rules/plugins and upgrade Vitest together with its exact-match coverage provider. Use Node.js 22 (22.12+ for Vitest 5), install with the lockfile, and run lint, full type checks, coverage tests, build and the isolated database check. CI additionally installs Supabase CLI and checks Wrangler/version plus a local Pages Functions build without production credentials. These smoke checks do not establish production deployment or native-device acceptance.

Consolidated maintenance may supersede bot PRs: merge the checked head first, then close the superseded PRs and delete their branches. Do not alter the active developer checkout or disable dependency monitoring as part of branch cleanup.
