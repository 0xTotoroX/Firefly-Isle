<!--
[INPUT]: 依赖 /supabase/migrations/001_init.sql、/.env.local.example、/src/lib/supabase.ts、/supabase/functions/llm-proxy 与 OpenSpec 中已完成的 Supabase / LLM 事实。
[OUTPUT]: 提供 Firefly-Isle 的 Supabase 配置参考、邮件确认/密码恢复、db push、bucket、storage policy、LLM proxy、术语与常见错误手册；历史部署事实需现场复核。
[POS]: docs/operations/supabase 的主 runbook，供下次重新配置项目时直接照做。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# Firefly-Isle Supabase 操作手册

这份手册保留早期 Supabase 配置步骤。下列区域、project_ref、已落库状态和旧绝对路径是历史记录，不能当作当前部署证据；正式目标按 `../record-integrity-release.md` 和 `../../products/saas-acceptance.md` 重新核对，全部当前迁移以仓库 `supabase/migrations/` 为准。

## 0. 当前项目事实

- 项目 `project_ref`：`irkjblpzmclqekxbexll`
- 区域：新加坡 `ap-southeast-1`
- 前端环境变量：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_EDGE_FUNCTION_URL`
- 已落库迁移：`/Users/Totoro/Desktop/Firefly-Isle/supabase/migrations/001_init.sql`
- 已创建 Storage bucket：`patient-assets`
- 已验证完成的阶段：OpenSpec `3.1 ~ 3.7`
- 当前已实现的 5.x 代码边界：
  - `supabase/functions/llm-proxy/index.ts`
  - `supabase/functions/llm-proxy/handler.ts`
  - `src/lib/llm/index.ts`
  - `src/lib/llm/types.ts`
- 若你是从零重建 Supabase 项目，仍需重新配置 Gemini / DeepSeek LLM proxy secrets，并重新部署 `supabase functions deploy llm-proxy`

真相源文件：

- `/Users/Totoro/Desktop/Firefly-Isle/supabase/migrations/001_init.sql`
- `/Users/Totoro/Desktop/Firefly-Isle/.env.local.example`
- `/Users/Totoro/Desktop/Firefly-Isle/src/lib/supabase.ts`
- `/Users/Totoro/Desktop/Firefly-Isle/openspec/changes/mvp-core/tasks.md`
- `/Users/Totoro/Desktop/Firefly-Isle/openspec/changes/mvp-core/design.md`

## 1. 从零创建 Supabase 项目

### 1.1 创建项目

在 Supabase Dashboard 新建项目时，固定这些事实：

- Region 选 `Singapore (ap-southeast-1)`
- 记下 `project_ref`
- 保存数据库密码，不要只记在脑子里

为什么必须选新加坡：当前项目已经把 APAC 实测后的最终节点固定为 `ap-southeast-1`。后面如果换区，URL、pooler host、函数域名和文档都要一起改。

### 1.2 认证设置

当前项目规划依赖两种登录模式：

- Email + Password
- Anonymous Sign-In

因此在 Dashboard 的 Auth 配置里至少检查：

- Email provider 可用
- Email 的 Confirm email 可开启或关闭；开启时注册后等待用户确认邮件，关闭时直接恢复 session。正式邮件需要可用 SMTP，不以本地 Mailpit 成功推断外部邮箱已可投递
- Anonymous Sign-In 已开启；如果前端匿名入口返回 422，优先回到这里核对是否被关闭
- Site URL 指向当前前端，Additional Redirect URLs 包含该前端的 `/auth/callback` 与 `/auth/reset-password`；本地对应 `http://127.0.0.1:5173` 下的两个路径。确认与重置链接在同一浏览器完成 PKCE；失效链接应显示错误，不因浏览器有旧账号会话而允许改密

说明：匿名登录不是“无身份”。Supabase 会为匿名用户创建真实 uid，所以后面的 `auth.uid()` RLS 和 Storage policy 仍然成立。

## 2. CLI 与 Token

### 2.1 安装 CLI

如果本机还没装：

```bash
brew install supabase/tap/supabase
supabase --version
```

### 2.2 获取访问令牌

在 Supabase 账号设置里创建 Personal Access Token，然后执行：

```bash
supabase login
```

如果你更喜欢显式 token，也可以先导出环境变量：

```bash
export SUPABASE_ACCESS_TOKEN="<your-personal-access-token>"
```

### 2.3 可选：link 项目

```bash
supabase link --project-ref irkjblpzmclqekxbexll
```

这一步只算方便，不算真相源。当前项目已经验证过的迁移路径是显式 `--db-url`，不要把成功与否押在本地 link 状态上。

## 3. 前端环境变量

### 3.1 复制模板

```bash
cp .env.local.example .env.local
```

### 3.2 填入项目值

```dotenv
VITE_SUPABASE_URL=https://irkjblpzmclqekxbexll.supabase.co
VITE_SUPABASE_ANON_KEY=<dashboard anon key>
VITE_SUPABASE_EDGE_FUNCTION_URL=https://irkjblpzmclqekxbexll.functions.supabase.co
```

注意：

- `VITE_SUPABASE_ANON_KEY` 从 Dashboard 复制，不写进 git
- `VITE_SUPABASE_EDGE_FUNCTION_URL` 可以先填好；在 `llm-proxy` 未部署前，请求它会 404，这是正常现象
- 三个值里的 `project_ref` 必须一致

## 4. 数据库迁移：只走已验证路径

### 4.1 迁移文件

当前唯一迁移文件：

- `supabase/migrations/001_init.sql`

它负责：

- 创建 `patients`
- 创建 `treatment_lines`
- 启用 RLS
- 创建 owner-only policies
- 创建 `patients.updated_at` trigger

### 4.2 获取 session pooler 连接串

从 Supabase Dashboard 复制 session pooler URI。当前项目已验证成功的主机模式是：

```text
postgresql://postgres.<project_ref>:<db_password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

重点：

- 用 session pooler / PgBouncer 地址
- 不要把 `.temp/pooler-url` 里的无密码片段当成最终连接串
- 不要依赖记忆里的旧密码

### 4.3 推送迁移

```bash
supabase db push --db-url 'postgresql://postgres.<project_ref>:<db_password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
```

这个项目已经成功走通过一次的，是这条显式 `--db-url` 路径。

### 4.4 推送后检查清单

在 SQL Editor 或数据库检查里确认：

- `public.patients` 存在
- `public.treatment_lines` 存在
- 两张表的 RLS 都开启
- `patients_set_updated_at` trigger 存在
- `treatment_lines.patient_id -> patients.id` 级联删除存在

可直接跑这些 SQL：

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('patients', 'treatment_lines');

select policyname, tablename
from pg_policies
where schemaname = 'public'
  and tablename in ('patients', 'treatment_lines')
order by tablename, policyname;

select tgname
from pg_trigger
where tgname = 'patients_set_updated_at';
```

## 5. Storage bucket

### 5.1 创建 bucket

在 Dashboard → Storage 中手动创建：

- bucket 名：`patient-assets`
- 公有访问：关闭

当前 MVP 只是先把 Storage 基础设施边界落好，还没有把上传流程接进主 UI。

### 5.2 对象路径约定

所有对象 key 必须以用户 uid 作为第一段目录：

```text
<uid>/<filename>
<uid>/images/<filename>
<uid>/attachments/<filename>
```

不要把文件直接丢到 bucket 根目录。路径第一段如果不是 uid，后面的 policy 会直接拒绝访问。

## 6. Storage policy

当前 repo 里还没有独立版本化的 Storage policy SQL，因此下次恢复时直接在 SQL Editor 执行下面这份脚本。

```sql
drop policy if exists patient_assets_select_own on storage.objects;
create policy patient_assets_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'patient-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists patient_assets_insert_own on storage.objects;
create policy patient_assets_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'patient-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists patient_assets_update_own on storage.objects;
create policy patient_assets_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'patient-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'patient-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists patient_assets_delete_own on storage.objects;
create policy patient_assets_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'patient-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

为什么是 `to authenticated` 而不是额外给 `anon`：

- 本项目的“匿名模式”指 Supabase Anonymous Sign-In
- 这种模式下用户仍然拥有真实 uid
- 因此仍然走 `auth.uid()` 和 `authenticated` 角色逻辑

### 6.1 Storage 验证清单

至少做一次人工验证：

- 用户 A 上传 `A_UID/test.txt`，自己可读
- 用户 B 读取 `A_UID/test.txt` 失败
- 匿名用户读取 `A_UID/test.txt` 失败
- 上传到 `wrong-prefix/test.txt` 失败

## 7. 术语表

### project_ref

Supabase 项目的短标识。本项目是 `irkjblpzmclqekxbexll`。URL、函数域名、pooler 用户名都会用到它。

### anon key

前端可见的匿名公钥。它不是 service role key，但也不能乱提交进仓库。

### service role key

高权限后端密钥。前端绝不能使用，也不应该放进 `.env.local`。

### session pooler / PgBouncer

数据库连接池入口。这个项目的 `db push` 已验证通过的是显式 `--db-url` + pooler URI。

### cmux

`cmux` 不是本项目概念。

如果你脑子里想的是“为什么 `db push` 这里有个特殊地址”，你要找的其实不是 `cmux`，而是：

- session pooler
- PgBouncer
- 连接池地址

一句话：本项目没有 `cmux`，这里只有 Supabase 的 pooler / PgBouncer 连接池地址。

## 8. 常见错误

### 8.1 `Missing Supabase environment variables in .env.local`

原因：`.env.local` 没填全，或者 key 名拼错。

检查：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_EDGE_FUNCTION_URL`

### 8.2 `supabase db push` 连接失败

常见原因：

- 用了旧密码
- 用了非 pooler 地址
- 复制了不完整连接串
- region host 不匹配

先回 Dashboard 重新复制完整 session pooler URI，再执行一次，不要猜。

### 8.3 查询/写入被 RLS 拒绝

典型症状：

- 查不到自己刚写入的数据
- 插入时报 policy error

优先检查：

- 当前 session 是否真的登录成功
- `patients.user_id` 是否等于当前 `auth.uid()`
- `treatment_lines.patient_id` 指向的 patient 是否属于当前用户

### 8.4 Storage 返回 403

优先检查：

- bucket 是否真叫 `patient-assets`
- policy 是否已创建
- 对象 key 第一段是否为当前 uid
- 当前用户是否真的有 session

### 8.5 Edge Function URL 404

这是当前阶段最容易误判的点之一。

原因通常是：

- `VITE_SUPABASE_EDGE_FUNCTION_URL` 已填
- 但 `llm-proxy` 还没部署，或者部署后函数名不匹配

也就是说：URL 可以存在，但函数可能尚未上线。

当前实现真相源：

- `supabase/functions/llm-proxy/index.ts` 是 Deno 启动壳
- `supabase/functions/llm-proxy/handler.ts` 是 Gemini / DeepSeek provider proxy 核心
- 前端统一入口是 `src/lib/llm/index.ts`
- 真正对外可用仍取决于：
  - `supabase secrets set GEMINI_API_KEY="..." DEFAULT_GEMINI_MODEL="gemini-2.5-flash" DEEPSEEK_API_KEY="..." DEFAULT_DEEPSEEK_MODEL="deepseek-v4-flash" DEFAULT_LLM_PROVIDER="deepseek" DEEPSEEK_BASE_URL="https://api.deepseek.com"`
  - `supabase functions deploy llm-proxy`

当前系统内置路径使用 `DEFAULT_LLM_PROVIDER=deepseek`。DeepSeek key、余额、限流和结构化提取 live 验证必须在发布前复核；回滚时改回 `gemini` 并记录原因。

### 8.6 匿名入口返回 422

典型返回：

```json
{"code":"anonymous_provider_disabled","message":"Anonymous sign-ins are disabled"}
```

优先检查：

- Dashboard → Auth Providers 中的 Anonymous Sign-In 是否被关闭
- 当前前端是否真的调用了 `supabase.auth.signInAnonymously()`，而不是被别的登录流兜底

### 8.7 邮箱注册返回 400

当前实现默认直接调用：

- `supabase.auth.signUp({ email, password })`

也就是说，默认注册流程不再强依赖 `emailRedirectTo: window.location.origin`，但强依赖 Supabase 直接返回 session。

如果本地注册直接 400，优先检查：

- Dashboard → Auth URL Configuration 的 Site URL 是否有效
- 是否有其他分支/旧代码重新显式传入 `emailRedirectTo`
- 当前本地访问地址是否和 allow list 完全一致（协议、host、端口都要一致）

如果本地注册返回成功但没有进入工作区，而是出现“注册未返回有效会话”，优先检查：

- Dashboard → Auth Providers → Email 的 Confirm email / 邮箱确认是否仍然开启
- 是否有项目级 Auth 设置强制新邮箱先确认后才签发 session
- 代码是否仍在期待“查收验证邮件”的旧分支

## 9. 发布前 Supabase 安全与可用性复核

在 11.5 收口前，至少逐项确认下面这些点，而不是只看本地开发环境能否跑通。

### 9.1 RLS / 数据隔离复核

- 用两个不同已登录账户验证：用户 A 看不到用户 B 的 `patients` / `treatment_lines`
- 若保留匿名模式，再用匿名会话验证：匿名 uid 只能读写自己的记录
- 随机抽查新建、编辑、刷新恢复、退出后重登这几条链路，确认 `user_id = auth.uid()` 约束没有被绕开
- 若发布环境更换了 Supabase 项目，重新执行一遍 `4.4 推送后检查清单`

### 9.2 Storage 访问策略复核

- `patient-assets` bucket 仍为私有
- `storage.objects` 上的 policy 仍存在，且路径第一段必须是 uid
- 用户 A 无法读取用户 B 的对象
- 匿名会话无法读取其他匿名 uid 或注册用户的对象
- 错误前缀（如 `wrong-prefix/test.txt`）仍会被拒绝

### 9.3 Edge Function / 核心链路复核

- `llm-proxy` 已部署到当前发布环境，对应 `VITE_SUPABASE_EDGE_FUNCTION_URL` 可达
- 前端请求仍只打到 Supabase Edge Function，不直接暴露模型 API key
- Gemini / DeepSeek API key 均只存在于 Supabase secrets；浏览器网络请求只包含 Supabase JWT
- `DEFAULT_LLM_PROVIDER=deepseek` 与 `DEFAULT_DEEPSEEK_MODEL=deepseek-v4-flash` 符合当前系统内置发布策略；临时回滚到 Gemini 时记录原因
- 发布环境里至少手动走一遍：登录/匿名进入 → 提取 → 追问 → 渲染 → 编辑 → 导出
- 若当前发布环境关闭了 Anonymous Sign-In，就不要把匿名模式写成“已可用”；先改配置，或同步改 spec / README / 产品文案

### 9.4 当前 11.5 已知缺口

截至当前仓库状态，下面这些仍不能视为“已完成复核”：

- 还没有一份针对发布环境的已执行 11.5 勾选记录
- Storage policy 仍是手工 SQL，不是迁移文件的一部分
- `llm-proxy` 的发布环境可用性仍依赖外部模型 secret、provider 默认值与 deploy 状态
- 匿名模式是否可用取决于 Dashboard 的 Auth provider 配置，不能只从前端代码推断

## 10. 一次性恢复清单

从零恢复时，按这个顺序做：

1. 新建 Supabase 项目，Region 选 `ap-southeast-1`
2. 保存数据库密码与 `project_ref`
3. 创建 Personal Access Token，完成 `supabase login`
4. 复制 `.env.local.example`，填好 3 个 Vite 变量
5. 在 Dashboard 检查 Email provider、Confirm email 已关闭、Anonymous Sign-In；如后续重新启用验证邮件或显式传入 `emailRedirectTo`，再配置本地 origin redirect allow list
6. 从 Dashboard 复制 session pooler URI
7. 执行 `supabase db push --db-url '<完整 pooler 连接串>'`
8. 在 Dashboard 手动创建 `patient-assets`
9. 在 SQL Editor 执行 Storage policy SQL
10. 用两个不同用户 + 一个匿名用户验证隔离
11. 配置 Gemini / DeepSeek proxy secrets：`GEMINI_API_KEY`、`DEFAULT_GEMINI_MODEL`、`DEEPSEEK_API_KEY`、`DEFAULT_DEEPSEEK_MODEL`、`DEFAULT_LLM_PROVIDER`
12. 执行 `supabase functions deploy llm-proxy`
13. 再开始 `6.x` 的信息提取主流程

## 10. 当前已知文档漂移

这不是阻塞，但下次排查时别被旧文档带偏：

- `docs/products/archive/spec.md` 仍写 `001_initial_schema.sql`，真实文件是 `001_init.sql`

当这些旧文档和本手册冲突时，以迁移文件和实际目录为准。
