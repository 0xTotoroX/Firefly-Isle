<!--
[INPUT]: 依赖 2026-09-01 ~ 2026-09-02 SaaS 重构会话的执行日志、Supabase Management API 只读核对（2026-09-05 复核）、docs/operations/supabase/README.md 与 ops/firefly-isle-supabase-inactive-restore.md runbook。
[OUTPUT]: 对外提供本次会话在代码仓库之外产生的全部副作用清单：控制面、数据库 schema、数据行、本机残留与密钥暴露面；并标注可逆性与清理路径。
[POS]: docs/operations 的会话副作用真相源，供下次接手的人区分「代码 commit」与「外部状态变更」，避免把暂停/恢复/迁移的历史误当成当前事实。
[PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-->

# 会话副作用记录 · 2026-09-01 ~ 09-02（SaaS 专业化重构）

分支 `refactor/saas-professionalization`（未推送）。本文件只记录**仓库 commit 之外**的外部状态变更；代码变更见 git log 与 `docs/products/saas-refactoring-plan.md`。

## 1. Supabase 控制面

| 副作用 | 详情 | 可逆性 |
| --- | --- | --- |
| 项目恢复 | `irkjblpzmclqekxbexll`（firefly-isle，ap-southeast-1）从 `INACTIVE` 经 `POST /v1/projects/{ref}/restore` 恢复，轮询至 `ACTIVE_HEALTHY`（09-02 11:45 左右）。恢复原因：登录/匿名会话全挂，诊断确认是 Free Plan 闲置自动暂停，不是前端问题。 | 无需回滚；再次闲置会再次暂停（runbook 可复跑） |
| supabase link | 本地执行 `supabase link --project-ref`，生成 `supabase/.temp/*` 关联状态文件（pooler-url、project-ref 等，gitignored）。 | 删除 `supabase/.temp/` 即解除 link |

## 2. 数据库 schema（迁移应用）

通过 Management API `POST /v1/projects/{ref}/database/query`（需 `User-Agent` 头，无 UA 会被 Cloudflare 1010 拦截）逐个应用了 **002 ~ 011 全部十个迁移**。`supabase db push` 不可用：直连 `db.*.supabase.co` 连接被掐断，pooler URL 无密码（SASL 失败）。

新落地的 schema：`lab_results`、`lab_report_batches`、`llm_provider_settings`、`clinical_notes` 列、`record_shares`、`profiles`（+ `on_auth_user_created` 自动建档触发器）、`delete_own_account()` RPC、`usage_events`（+ `record_usage()` RPC）、`plans`/`subscriptions`、`donations`（011，一次性捐赠）。

## 3. 数据行副作用

| 表 | 变化 | 说明 |
| --- | --- | --- |
| `profiles` | 0 → 175 | 迁移触发器为存量用户建档后，又手工执行了 `insert ... select from auth.users on conflict do nothing` 回补；现与 `auth.users` 一一对应 |
| `auth.users`（匿名） | 156 → 166 | **新增约 10 个匿名测试账号**，全部产生于本会话的验收探针与浏览器冒烟测试，已知 ID 前缀：`29055f1f`、`9b857ced`、`8f65d5f2`、`73540826`（curl 探针）、`ba15b8cf`（浏览器匿名登录）。其余为同窗口的重复冒烟 | 
| `auth.users`（邮箱） | 9 → 9 | 未改动；已知 9 个邮箱账号与身份关系见会话记录，其中 6 个为预览/测试 Gmail |
| `patients` | 13 → 13 | 业务数据未触碰 |
| `treatment_lines` | 76 → 76 | 业务数据未触碰 |
| `plans` | 0 → 3 | 迁移种子行（free / pro / donation） |
| `donations` / `usage_events` / `record_shares` / `lab_results` / `lab_report_batches` / `llm_provider_settings` | 0 | 空表，无写入 |

**清理选项**：10 个匿名测试账号可通过 `delete from auth.users where is_anonymous and created_at > '2026-09-01'` 移除（级联清 profiles 等）；不清理也无业务影响，仅占用户数。

## 4. 密钥与敏感面

- Supabase CLI PAT 全程只从 Keychain 解码到内存变量，未打印明文、未写盘、未进 commit。
- anon key 曾出现在会话工具输出中（读 `.env.local` 与 curl 参数）：anon key 设计上就是公开凭据（浏览器端明文使用），不构成泄漏。
- 未修改 `.env.local` / `.dev.vars` / `wrangler.jsonc` 的任何密钥值。
- Stripe 密钥从未配置过；捐赠/计费入口保持 fail-closed。

## 5. 部署面

- Cloudflare Pages 生产站（firefly.ghibli1024.com）**未部署**本轮任何代码；生产仍是旧版本。
- 本机预览经 `work/csp-preview-server.mjs`（gitignored scratch）跑在 4173 端口，进程随会话存续。
- Edge Functions（llm-proxy / medical-document-ocr / billing-* / stripe-webhook）**未重新部署**；线上仍是旧函数，前端新代码调用新行为前必须先部署函数。

## 6. 本机残留（gitignored 或临时）

- `supabase/.temp/`（link 状态）、`work/`（预览服务脚本与日志）、`.playwright-cli/`（截图与 console 日志）、`coverage/`（如跑过 coverage）。

## 复核记录

- 2026-09-05：Management API 只读复核——项目 `ACTIVE_HEALTHY`；`auth.users` 175（匿名 166 / 邮箱 9）；`profiles` 175；`patients` 13；`treatment_lines` 76；`plans` 3；其余业务表 0 行。
- 2026-09-05 增补：应用 `012_side_effects.sql`（患者副作用日志表），新增公开表 `side_effects`（0 行）。原因：产品需求新增「患者副作用记录页」（`/record/:id/side-effects`），schema 由迁移 012 提供。

- 2026-09-05 增补：应用 `013_follow_up.sql`（随访模块），新增公开表 `follow_up_visits`（0 行）与 `patients.follow_up_status` 列。原因：产品新增随访页（F1 倒计时 / F2 就诊记录 / F3 显式状态 / F4 摘要整合）。

## 待办

- [ ] 更新 runbook `ops/firefly-isle-supabase-inactive-restore.md` 的「最后验证」：本次已端到端执行恢复（09-02，2.5 分钟到 ACTIVE_HEALTHY），并补充两个新事实——Management API `database/query` 必须带浏览器 `User-Agent`（否则 Cloudflare 1010）；该项目 `supabase db push` 不可用（直连被掐、pooler 无密码 SASL 失败），SQL 走 Management API。**暂缓原因：ABox 外置卷未挂载，runbook 文件不可达。**
