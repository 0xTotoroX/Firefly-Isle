# Firefly 自建 Supabase

## 当前代码与部署边界

当前（2026-10-06）：现有公开测试网址已改接上海自托管 Supabase，并使用独立登录会话，用户确认不迁移旧测试数据。Cloudflare production 是平台部署环境名称，不表示真实患者服务已正式投产。最新部署与验收见本文末尾；以下各日期记录按历史状态读取。

2026-10-02 已将自托管准备整合到当前 SaaS 代码：浏览器会话续接、CSP/PWA 自建域名、运行配置示例、备份与恢复脚本。`wrangler.jsonc` 继续指向 Supabase Cloud；合并代码不会切换生产后端，`supabase-deploy.yml` 仍是云端专用的手动工作流。

2026-09-14 的历史记录表明：自建环境完成过数据恢复、迁移预览、匿名会话续接、密码登录、病历 CRUD/RLS、分享、DeepSeek 和恢复演练；当时正式主站尚未切换。该记录不是当前部署验收，也不证明当前 SaaS 版本已经部署。

2026-10-05 经腾讯云控制台与远端只读命令确认：现有预览实际运行在用户的上海四区 Lighthouse，4 核 4GB/40GB，机器还承载其他代理类服务。Firefly 的 PostgreSQL、Auth、PostgREST、Edge Runtime、Storage、Envoy 和 imgproxy 容器已存在；先核对这套环境并升级目标版本，不重复安装。单次资源读数和容器 healthy 均不证明生产容量、当前 schema/functions、邮件/OAuth 或恢复通过。当前生产配置仍指向官方新加坡项目。

同日只读 SQL 核验：目标 public 中未查到 `persist_patient_record`、`get_shared_patient_record`、`consume_usage`、`save_lab_report_batch`；关键 owner 表的 RLS 开关为真，这不代替权限行为测试。`firefly-backup.timer` 为 active/waiting，最近触发时间为当日，service 的 Result=success、ExecMainStatus=0，最近备份目录存在；本轮没有恢复备份或修改数据库。正式新域名的国内 HTTPS 入口也需另验，不能把机器位于上海当作请求没有经过 Cloudflare Tunnel 的证据。

- 正式站：`https://firefly.ghibli1024.com`。
- 自建后端：`https://supabase.ghibli1024.com`。
- 历史迁移预览：`https://firefly-migration.firefly-isle.pages.dev`。
- VPS 运行目录：`/opt/firefly-supabase`。SSH 目标、真实备份位置与凭据由部署人员私下保存。

正式切换仍需验证 SMTP 注册确认/找回密码、Google OAuth、当前模型与 OCR 配置、异机备份，以及当前数据库和函数版本。历史 Google secret 和 Gemini key 曾不可用，应重新核对，不以旧错误推断现在的状态。

## 2026-10-06 上海预览升级与验收

本轮按用户授权更新上海预览，不切换 Cloudflare 正式网站，也不搬迁新加坡的最新病历。先在一次性数据库恢复升级前备份，追加六份 `2026*.sql` 迁移；原病历相关表的数量与内容摘要一致。数据权限、幂等创建、账号隔离、临床事务、病历完整性、额度和支付权限共七组 SQL 合成测试通过，随后在上海预览单事务追加相同迁移。部署前后原目标病历表摘要一致。

目标已部署当前 `llm-proxy`、共享函数及 OCR 的默认模型修正。真实 HTTP 合成验收通过密码/匿名登录、刷新、病历事务保存与幂等重试、跨账号隔离、化验、分享撤销、BYOK 脱敏/隔离、真实 DeepSeek 文本提取及登出；第一轮 29 项中 27 项通过，两项 OCR 初测失败，已按下述新链路复验。三个 HTTP 临时账号及网页测试账号均已清理，连同各自合成病历。

升级前备份与部署前备份分别位于服务器 `/var/backups/firefly/20261005T155501Z-before-7417f10`、`/var/backups/firefly/20261005T160151Z-deploy-7417f10`，数据库、角色和运行文件的 SHA-256 校验通过。恢复与追加迁移已在一次性库验证；完成网页验收并清理合成账号后，升级后的完整备份保存在 `/var/backups/firefly/20261005T165216Z-current-deepseek`，校验通过并恢复到本轮新建的临时数据库。七张关键病历表的数量/内容摘要与当前目标一致，四个关键 RPC 存在；临时数据库已删除。该演练在同一服务器，不代表异机灾备已验收。备份含私有数据与凭据，仅留服务器，不进入 Git。

报告 OCR 代码改为只调用 DeepSeek `deepseek-flash`，移除这条链路的 Gemini 分支。图片支持 JPEG、PNG、GIF、WebP；PDF 使用 PDF.js 在浏览器逐页渲染，然后按页码提交一个多图请求，只消费一次 `ocr_document` 额度。文件原始大小限制 8 MiB，转换后累计图像的 base64 长度上限为 11,184,811 字符（约 8 MiB 原始图像），最多 600 页（对应上游图像数量限制）；加密、损坏或过大的 PDF 返回可恢复错误。Worker、CMap、字体和解码资源随构建同源分发，不加载 CDN。原始 PDF 不写入本地持久存储或静态站目录。

`GEMINI_API_KEY` 的旧配置不再被 OCR 读取；独立文字 BYOK provider 的兼容配置保留。模型/API 命名依据 [DeepSeek Vision](https://api-docs.deepseek.com/guides/vision/)，PDF 渲染依据 [Mozilla PDF.js](https://mozilla.github.io/pdf.js/examples/)。新前端必须与新的 PDF 页面协议函数一起验收；不要让旧前端直接向新函数上传 PDF 原文。

本地 lint、类型检查、105 个测试文件共 745 项测试及构建通过；后续增加上游截断拒绝用例，相关 24 项测试、函数类型和 lint 通过。浏览器已用合成账号登录上海后端；两页合成 PDF 按顺序渲染且无控制台错误。新的 DeepSeek-only OCR 已部署到上海预览，handler SHA-256 为 `02f0a75002688c38d12ce8683629055ca70ce370f72a8fe496637240d1c67938`，运行配置已删除 OCR_PROVIDER/GEMINI_OCR_MODEL 并设为 deepseek-flash。真实 PNG OCR 和公开 HTTPS Auth 均返回 200；网页上传两页合成 PDF，正确返回两页日期、WBC 5.0 和 CEA 6.0 并显示人工确认。网页合成中文病历提取已创建患者，进入详情并刷新后姓名、年龄与当前治疗方案仍可读取。此项证明保存链路；模型在该例仍生成多余初发段，提取准确性需人工复核，不把读写成功当成临床内容验收。

SMTP 按用户决定本轮保留未配置、未验收；不能宣称邮箱注册确认或找回密码可用。Google OAuth、新域名/备案、正式 HTTPS 入口与生产切换仍单独验收。当前 API 域名经 Cloudflare Tunnel，不是已经建成国内直连入口。

## 部署结构

固定上游为 Supabase `self-hosted/v0.8.1`，commit `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`；PostgreSQL 为 `supabase/postgres:17.6.1.136`。更新前阅读对应 changelog。

`ops/self-hosted/docker-compose.yml` 使用上游该版本 `docker/` 内的挂载脚本和模板。初次重建先取得完整固定版本目录，再覆盖本项目 compose，填写私有 `.env`、`functions.env` 和 `egress.yml`。不能只复制一个 compose 文件到空目录运行。

默认运行 PostgreSQL、Auth、PostgREST、Envoy、Edge Runtime、Storage、imgproxy 和内部出口。Studio/Postgres Meta 属于 `admin` profile，Realtime/Supavisor 属于 `optional` profile。日志平台未启用。

唯一宿主端口为 `127.0.0.1:54321`，经 Cloudflare Tunnel 对外提供 HTTPS。数据库、Studio 和内部出口不映射公网端口。Google 请求需要可用的出口；账号仅放私有 `egress.yml`。先检查 VPS 既有服务、资源和端口，避免覆盖其他服务。

## 配置与会话

`ops/self-hosted/.env.example` 是容器配置示例。`API_EXTERNAL_URL` 包含 `/auth/v1`，Google 回调为 `https://supabase.ghibli1024.com/auth/v1/callback`。SMTP 与 OAuth 需要单独配置，数据库恢复不会自动恢复供应商配置。

`functions.env.example` 对应当前函数配置。恢复已有模型密钥密文时，必须保留原 `LLM_PROVIDER_SETTINGS_ENCRYPTION_KEY`。当前图片和 PDF 页面 OCR 统一走 DeepSeek；不再配置 OCR_PROVIDER 或 GEMINI_OCR_MODEL。支付功能仅在所需配置齐备时启用。

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

## 2026-10-06 测试数据直接切换

用户确认旧站未正式投产，全部为可放弃测试数据，授权不迁移旧库而直接连接上海。仓库公开配置已改为上海 API 与函数地址，并使用 `myoncode-shanghai-auth-v1` 独立登录命名；旧浏览器会话不导入，须重新登录。不会清空旧库或删除旧 Cloudflare deployment。

准备检查：当前上海 Auth 已允许现有 Web/Pages 回调，核心容器 healthy；34 项认证/客户端相关测试、应用/工具类型与相关 lint 通过。Cloudflare 当前入口已于北京时间 2026-10-06 01:15 发布，部署 ID 为 `1368ab8f-2ea9-4bf9-88b2-4413d755d69f`，对应源码 `ce940bdc7d9e7031083c1deea6233e36555aecb5`。旧部署 ID `dc95230e-85e3-4524-a62c-5231338fd48e` 保留。项目 API 的 canonical_deployment 已指向新部署，状态 success。

实际网址匿名登录从空病历开始；浏览器网络记录确认 Auth、REST、medical-document-ocr、llm-proxy 和 persist_patient_record 全部请求上海域名并返回 200。两页 PDF 在严格 CSP 下识别成功、待人工确认；合成病历提取及保存成功，详情刷新后仍读回姓名、年龄和当前方案；上海服务端已按唯一 ID 核对该记录，确认属于本次匿名测试身份；登出后已删除该身份及其测试病历，写入服务器 `releases/7417f10-validation/public-site-cutover.json` 记录。SMTP/Google 不在本轮验收范围，均不得标为已可用。

发布期间发现完整对应源码包约 85 MiB，超过 Pages 单文件 25 MiB。构建现按 20 MiB 分卷，保留整体和每卷 SHA-256 及拼接说明；五卷已从公开源码入口完整下载并验证整体摘要。完整对应源码、许可通知均未裁减；748 项全量测试、类型、lint 与构建通过。网页文件仍通过 Cloudflare Pages 承载，腾讯云前端与备案域名另行推进。
