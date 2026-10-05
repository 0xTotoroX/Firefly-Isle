# Firefly 自建 Supabase

## 当前代码与部署边界

2026-10-02 已将自托管准备整合到当前 SaaS 代码：浏览器会话续接、CSP/PWA 自建域名、运行配置示例、备份与恢复脚本。`wrangler.jsonc` 继续指向 Supabase Cloud；合并代码不会切换生产后端，`supabase-deploy.yml` 仍是云端专用的手动工作流。

2026-09-14 的历史记录表明：自建环境完成过数据恢复、迁移预览、匿名会话续接、密码登录、病历 CRUD/RLS、分享、DeepSeek 和恢复演练；当时正式主站尚未切换。该记录不是当前部署验收，也不证明当前 SaaS 版本已经部署。

2026-10-05 经腾讯云控制台与远端只读命令确认：现有预览实际运行在用户的上海四区 Lighthouse，4 核 4GB/40GB，机器还承载其他代理类服务。Firefly 的 PostgreSQL、Auth、PostgREST、Edge Runtime、Storage、Envoy 和 imgproxy 容器已存在；先核对这套环境并升级目标版本，不重复安装。单次资源读数和容器 healthy 均不证明生产容量、当前 schema/functions、邮件/OAuth 或恢复通过。当前生产配置仍指向官方新加坡项目。

同日只读 SQL 核验：目标 public 中未查到 `persist_patient_record`、`get_shared_patient_record`、`consume_usage`、`save_lab_report_batch`；关键 owner 表的 RLS 开关为真，这不代替权限行为测试。`firefly-backup.timer` 为 active/waiting，最近触发时间为当日，service 的 Result=success、ExecMainStatus=0，最近备份目录存在；本轮没有恢复备份或修改数据库。正式新域名的国内 HTTPS 入口也需另验，不能把机器位于上海当作请求没有经过 Cloudflare Tunnel 的证据。

- 正式站：`https://firefly.ghibli1024.com`。
- 自建后端：`https://supabase.ghibli1024.com`。
- 历史迁移预览：`https://firefly-migration.firefly-isle.pages.dev`。
- VPS 运行目录：`/opt/firefly-supabase`。SSH 目标、真实备份位置与凭据由部署人员私下保存。

正式切换仍需验证 SMTP 注册确认/找回密码、Google OAuth、当前模型与 OCR 配置、异机备份，以及当前数据库和函数版本。历史 Google secret 和 Gemini key 曾不可用，应重新核对，不以旧错误推断现在的状态。

## 部署结构

固定上游为 Supabase `self-hosted/v0.8.1`，commit `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`；PostgreSQL 为 `supabase/postgres:17.6.1.136`。更新前阅读对应 changelog。

`ops/self-hosted/docker-compose.yml` 使用上游该版本 `docker/` 内的挂载脚本和模板。初次重建先取得完整固定版本目录，再覆盖本项目 compose，填写私有 `.env`、`functions.env` 和 `egress.yml`。不能只复制一个 compose 文件到空目录运行。

默认运行 PostgreSQL、Auth、PostgREST、Envoy、Edge Runtime、Storage、imgproxy 和内部出口。Studio/Postgres Meta 属于 `admin` profile，Realtime/Supavisor 属于 `optional` profile。日志平台未启用。

唯一宿主端口为 `127.0.0.1:54321`，经 Cloudflare Tunnel 对外提供 HTTPS。数据库、Studio 和内部出口不映射公网端口。Google 请求需要可用的出口；账号仅放私有 `egress.yml`。先检查 VPS 既有服务、资源和端口，避免覆盖其他服务。

## 配置与会话

`ops/self-hosted/.env.example` 是容器配置示例。`API_EXTERNAL_URL` 包含 `/auth/v1`，Google 回调为 `https://supabase.ghibli1024.com/auth/v1/callback`。SMTP 与 OAuth 需要单独配置，数据库恢复不会自动恢复供应商配置。

`functions.env.example` 对应当前函数配置。恢复已有模型密钥密文时，必须保留原 `LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY`。当前图片 OCR 默认走 DeepSeek；PDF 需要切到 Gemini 并验证有效凭据。支付功能仅在所需配置齐备时启用。

`frontend.env.example` 仅供显式预览。复制到仓库根部被忽略的 `.env.selfhost.local`，填写自建公开 anon key，再运行 `npm run build -- --mode selfhost`。不要把 service-role 或私有 API key 写进 Vite 变量。预览前先完成目标 schema/functions 对齐，生产构建仍使用已审核的生产配置。

浏览器仅在配置为自建 origin 时复制旧云端凭据，保留旧存储项，并在路由开放前换取新 JWT。迁移完成标记阻止退出后重新导入旧身份。刷新失败、SDK 初始化丢弃过期凭据或后续再次广播旧 JWT 时，界面报告恢复失败，不把旧 JWT 放行到病历路由。浏览器原来已丢失的匿名凭据无法由服务器迁移恢复。

改认证环境后运行 `docker compose up -d auth`；改函数环境后运行 `docker compose up -d functions`；仅更新函数源码时运行 `docker compose restart functions`。这些都是部署操作，不能以容器健康代替真实功能验收。

## 当前 SaaS 版本发布要求

9 月预览曾使用线上旧版 `llm-proxy` 和 OCR 源码，不能继续作为当前前端的后端。

1. 对照目标数据库的实际 schema、迁移历史和备份核对 `supabase/migrations/`。已有手工 SQL 时不要盲目全量 `db push`。
2. 核对 `007` 至 `013` 的账号、使用量、计费、症状和随访能力，以及 `20260912051552_clinical_workflow_integrity.sql`。
3. 按 [病历完整性发布手册](record-integrity-release.md) 应用 10 月的病历/分享与原子额度迁移，同步发布当前 `llm-proxy`、OCR 和前端。新前端依赖这些 RPC；旧函数不能与新额度协议混用。
4. 核对全部已启用函数、共享模块、环境和网关认证策略。需要公开回调的函数必须有自己的有效签名校验，不能为一个 webhook 关闭全部函数的认证。
5. 用合成记录验收原匿名 uid、登录、新建/编辑后重载、化验、症状/随访、跨账号隔离、分享撤销和真实 AI/OCR。

## 备份与恢复

将 `backup.sh` 和 `check-restore.sh` 安装为 `/usr/local/sbin/firefly-backup`、`/usr/local/sbin/firefly-check-restore`，权限 `700`；把同目录 service/timer 安装到 systemd 后启用 timer。每日北京时间 04:15 开始，随机延迟最多 5 分钟，错过后补跑。

`/var/backups/firefly/<UTC timestamp>/` 保留 14 天完整备份集：数据库 custom archive、敏感角色定义、运行配置/函数/Storage 文件、SHA256 和 archive 目录。所有备份按私有数据保管，不提交 Git。

手动执行 `systemctl start firefly-backup.service`，检查 `Result`、`ExecMainStatus` 与 journal。`firefly-check-restore <database.dump>` 在本轮新建的临时数据库恢复 auth/public/storage 并查询数量，退出时只删除成功创建的测试库。

数据库导出和 Storage 打包不是一个原子快照。存在上传对象时，必须协调停写或一致快照，不能仅靠这个脚本声称文件与数据库完全一致。定期将完整备份集送到独立存储，并演练固定上游版本、角色、数据库和 runtime 的整机恢复。临时数据库恢复成功不等于整机灾难恢复完成。

## 正式切换步骤（仍待执行）

1. 完成上述配置、schema/functions 对齐、预览与恢复验证，重新确认源库仍是生产数据真相源。备份当前目标并记录原主站 deployment ID。
2. 在切换窗口使用源库 `postgres` 连接执行 `ops/self-hosted/freeze-source.sql`。它在事务内添加临时阻写 trigger，冻结 public/auth/storage 写入及 refresh-token 轮换。
3. 停写后用一致快照重新导出 public/auth/storage，排除 `auth.schema_migrations` 与 `storage.migrations`。账号、identities、sessions、refresh_tokens、应用 trigger/RLS 和 Storage 元数据均需核对；文件对象另行同步。不能复用 9 月的快照。
4. 停止目标应用写入后，在事务内同步最终数据，保留目标系统迁移表和已核对的 schema。数据导入避免触发器重复生成或加密，重设 sequences，比较全表数量和内容指纹。
5. 先验证新 JWT、原匿名 uid、RLS、真实登录和业务行为；再审核生产 Vite URL、anon key、Functions URL 与 OAuth callback，并构建部署当前主线。此时才更新 `wrangler.jsonc` 的生产目标。
6. 从正式主站重新验证后台请求、原病历恢复、保存/重载、登录、AI/OCR、分享和既有 VPS 服务。成功后再退休云端部署目标或改成明确的 VPS 发布流程。
7. 保留旧项目为恢复快照。新库已有生产写入时，回滚须反向同步数据，不能只改 URL。

尚未切换且目标没有生产新写入时，可在源库执行 `DROP SCHEMA firefly_cutover CASCADE;` 解除本次阻写。不得在两个库均可接收生产写入的状态下继续运行。

## 验证依据

本地行为测试覆盖会话迁移、CSP/PWA、退出和恢复错误；运维脚本在隔离环境检查。远端历史验收不代替当前发布验收。

官方参考：[平台项目恢复到自建](https://supabase.com/docs/guides/self-hosting/restore-from-platform)、[API_EXTERNAL_URL 的认证路径](https://supabase.com/changelog/47093-self-hosted-supabase-api-external-url-to-include-auth-v1)。本项目额外保留匿名 session/refresh-token 的迁移验证，不能仅凭账号表恢复就假设登录会延续。
