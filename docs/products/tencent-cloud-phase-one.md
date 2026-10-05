# 腾讯云迁移第一阶段：选型与申请准备

核查日期：2026-10-05。本文件承接[国内上线评估](domestic-launch.md)，记录第一阶段的现场盘点和待执行决定。它不代表已经购买资源、完成备案、部署新站或迁移病历。正式操作顺序见[切换操作单](../operations/tencent-cloud-cutover.md)。

当前结果：复用已经运行在上海轻量服务器上的 Supabase 预览；2026-10-06 已追加六份迁移、部署文字函数并通过合成登录/事务/权限验收；用户确认无需旧数据迁移，当前网址已改用上海后端，OCR 新链路与升级后备份验收见[自托管手册](../operations/supabase-self-hosted.md#2026-10-06-上海预览升级与验收)；前端目标为 EdgeOne Pages 大陆加速，暂不新购服务器。用户确认按浙江个人主体准备网站备案和小程序申请，不另设客服预核环节。

## 1. 项目与现网基线

| 对象 | 本轮读到的事实 | 发布前还须核对 |
| --- | --- | --- |
| 仓库 | 本地 `main` 为 `53cba56`，工作树在盘点开始时干净；比 `origin/main` 的 `7c1e945` 超前 14 个提交。最近本地提交包含 AGPL-3.0-only、品牌和源码包。 | 推送/发布应另行审查。不能把本地 HEAD 当成线上版本。 |
| 网站 | Cloudflare Pages 后台当日确认 Production 为 `0b41a7d`，部署 ID `dc95230e-85e3-4524-a62c-5231338fd48e`，状态 `success`，自动部署暂停。`firefly.ghibli1024.com` 和 `firefly-isle.pages.dev` 返回 HTTP 200。 | 正式操作前重新读 Cloudflare 后台。GitHub 上较新的成功 `cd.yml` 运行不能替代 Pages 实际 Production 指向。 |
| 构建 | Node 22 下 `npm run build` 通过，产物为静态 `dist/`，包括 PWA worker、许可页和源码包；源码包 manifest 标注本地 `53cba56`、非脏快照。 | 目标平台须实际检查深链接、响应头、缓存、PWA 更新与源码包下载。 |
| 许可 | 仓库有 `LICENSE`、`LICENSING.md`、`THIRD_PARTY_NOTICES.md`、`LICENSES/` 和 `config/source-distribution.ts`。 | 新站公开的源码包必须与实际运行的前端及相应后端版本一致。 |
| 后端 | 链接的 Supabase 项目位于 `ap-southeast-1`（新加坡），当日项目状态 `ACTIVE_HEALTHY`；库中已有账号和病历，不是空库。用户报告当前为 Free 套餐。 | 用量和 Auth 后台开关未从账户核验；不在公开仓库保存现网记录数或患者资料。 |
| 腾讯云现有资源 | 上海四区特惠型轻量服务器，4 核 4GB、40GB、3Mbps/300GB 月流量；购买期至 2027-09-04。本轮远端只读命令确认这台机器已经运行 `firefly-db/auth/rest/functions/storage/api-gw/imgproxy` 等自托管容器，并有其他代理类服务。 | 容器运行不代表当前 SaaS 版本、生产数据或上线验收通过。备份恢复、目标 schema/functions、并发余量和备案可选状态仍需验收；不要重复部署一套后端。 |

公开页面仍带旧 Firefly 文案；请求 `/source/source-manifest.json` 返回 SPA 的 `index.html`，未见新版源码入口。以上版本号和状态是一次现场快照；切换前重取。[Cloudflare 当前部署详情](https://dash.cloudflare.com/c38f90a65a89c28653e8b8d19739277f/pages/view/firefly-isle/dc95230e-85e3-4524-a62c-5231338fd48e)、[Supabase 地域说明](https://supabase.com/docs/guides/platform/regions)。

## 2. Cloudflare → 腾讯云兼容性矩阵

| 当前依赖 | 源码/配置入口 | 目标处理与验收 |
| --- | --- | --- |
| Vite SPA 的前端文件 | `package.json`、`config/vite.config.ts`，输出 `dist/` | EdgeOne Pages 可承载 HTML、JS、CSS 等前端文件；配置 Node 22、`npm ci`、`npm run build`、输出 `dist`。这不承载病历、Auth 或 OCR 后端。Lighthouse 则需服务器和静态文件服务配置。 |
| 路由回退 | `public/_redirects` | EdgeOne 需转换为 `edgeone.json` 的 rewrite；Lighthouse 需等效的 `try_files`。必须检查 `/auth/callback`、`/auth/reset-password`、`/record/:id`、`/share/:code`、`/source/`，不能让 API 路由落到 `index.html`。 |
| 安全与缓存响应头 | `public/_headers`，含 CSP 哈希、HSTS、静态资源缓存 | EdgeOne 需转换为 `edgeone.json` headers；Lighthouse 需等效响应头。对 HTML、带 hash 的资源、`sw.js` 和私有接口分别验收；修改内联脚本时重新计算 CSP 哈希。 |
| PWA | `public/sw.js`、Vite 预缓存插件、manifest | 目标站检查安装、更新和私有响应不入 Cache Storage；不能只凭构建通过。 |
| 微信网页扫码适配预研 | `functions/api/auth/wechat/` 四个 Pages Functions；`wrangler.jsonc` 绑定 `WECHAT_OAUTH_KV`。当前 Production 部署详情也列出四个函数路由和该 KV 绑定。 | 这只证明路由已部署，个人主体的网站应用资格、凭据与实际登录链路均未验证。EdgeOne 虽有 Functions/KV，但其 KV 文档声明跨节点最终一致、最长约 60 秒；当前代码使用状态码与一次性授权码的读后删除，不能机械替换 KV。正式接入需选择具备原子消费语义的存储并做重放测试。 |
| Cloudflare 构建与发布 | `.github/workflows/cd.yml` 在 tag 或手动 dispatch 时部署 Pages；CI 编译 Pages Functions | 腾讯云应新增独立预览及发布入口；迁移期间保留旧工作流和 Cloudflare 环境。既有 `wrangler.jsonc` 构建变量不能直接当作腾讯云环境变量。 |
| 后端 | 浏览器通过 `VITE_SUPABASE_*` 访问 Supabase；LLM/OCR 经 Edge Functions | 前端搬迁不自动改变数据库、Auth 和模型流向。先选后端路径并验收，再为新站构建对应公开 URL；服务端密钥不得放入 `VITE_` 变量。 |

仓库未发现 R2、D1 或 Cloudflare Cron 的配置调用；此结论限于当前仓库，不代替 Cloudflare 账户资源审查。[EdgeOne 的 Cloudflare Pages 迁移指南](https://edgeone.cloud.tencent.com/pages/document/165485994849755136)、[构建指南](https://edgeone.cloud.tencent.com/pages/document/162936788693114880)、[Functions](https://edgeone.cloud.tencent.com/pages/document/162936866445025280)、[KV 一致性](https://edgeone.cloud.tencent.com/pages/document/162936897742577664)。

## 3. 实际运行链路与部署选择

当前 Web 由 Vite 构建为 SPA 文件，没有 SSR；**产品本身是动态应用**。浏览器运行这些文件后，会直接向 Supabase 发起下列请求：

| 用户动作 | 实际请求链路 | 把前端文件搬到大陆后的变化 |
| --- | --- | --- |
| 打开页面、下载脚本与字体 | 浏览器 → Cloudflare Pages；目标可改为腾讯云 EdgeOne Pages 或 Lighthouse | 主要影响首次加载、刷新和静态资源更新。 |
| 登录、恢复会话、读写病历/指标、打开分享 | 浏览器 → Supabase Auth / Data API / RPC → PostgreSQL | 若仍使用当前新加坡 Supabase，这条业务请求仍需跨境；前端搬家不会移动数据库。 |
| 病历提取与报告 OCR | 浏览器 → Supabase Edge Function → 模型/OCR 供应商；OCR 会上传图片或 PDF 内容 | 除函数位置外，还取决于模型供应商、文件大小与上游处理时间。 |
| `/demo` | 浏览器内存中的虚构资料 | 不调用真实 Supabase 和模型，可用于单独检查前端展示，但不能证明正式业务速度。 |

由此，EdgeOne Pages 只是**前端文件的承载候选**，不是整个应用或数据库的迁移方案。它可直接接收 `dist/`，减少静态文件服务器维护；现有上海 Lighthouse 也足以承载这部分文件。最终选 EdgeOne 还是 Lighthouse，需连同后端位置一起，用大陆真实网络分别测页面加载、登录、病历读写和 OCR，而不能只看首页快慢。EdgeOne 预览还需证明 rewrite、响应头、PWA 和源码包行为等价；本轮尚未创建项目。选择大陆加速时，自定义域名需要 ICP 备案，个人浙江备案所需云资源不能假定由 EdgeOne Pages 单独提供。[Pages 地域与备案说明](https://edgeone.cloud.tencent.com/pages/document/175191784523485184)、[腾讯云备案资源](https://cloud.tencent.com/document/product/243/18908)。

备案看的是实际对外提供服务的域名、主体和接入服务。用户自己的 Mac 是开发环境，不是本次腾讯云备案所需的大陆接入资源；Cloudflare Pages 是当前旧站的托管平台，也不能因为在腾讯云购买了一台无关服务器就把旧站视为已迁入腾讯云。若新网站或 API 使用腾讯云大陆资源对外提供服务，应按实际域名和腾讯云接入路径办理备案，取得备案号后再开放；旧 Cloudflare 站可以保留为迁移期旧环境。Cloudflare 官方说明普通 Pages 不直接在中国大陆提供 Pages 服务，不能把 Cloudflare DNS、Pages 托管和腾讯云大陆接入混为一件事。[腾讯云备案流程](https://cloud.tencent.com/document/product/243/39038)、[腾讯云接入备案说明](https://cloud.tencent.com/document/product/243/97669)、[Cloudflare 中国网络 FAQ](https://developers.cloudflare.com/china-network/faq/)。

腾讯云境内自托管运行的是原版 Supabase 软件，不是 Supabase 官方在大陆提供的托管项目。数据库、Auth、API、Storage 与 Edge Functions 可以复用现有上海预览，正式使用前要完成容量、隔离与恢复验收；不把独立后端职责等同于必须再买一台机器。现有 4 核 4GB/40GB 达到[官方全组件最低规格](https://supabase.com/docs/guides/self-hosting/docker)，但低于 8GB+/80GB+ 建议规格，正式资源取舍应依据现有环境的高峰和恢复测试。备案资源的实际可选状态另核。如果继续留官方云，数据库和认证仍在新加坡。两条路径都不要求用个人 Mac 作为网站服务器。

本轮经腾讯云自动化助手执行只读 `free`、`df`、进程及 Docker 元数据检查，命令成功：机器已运行 14 个容器，包含一套 Firefly Supabase 和其他代理类服务；当时可用内存约 1.78GB，无 swap，根盘约用 9.7GB、剩余 30GB。此前控制台约 1.65GB 的内存读数已经包含现有 Supabase，不能把它当作安装 Supabase 前的基线。现有配置证明了低负载下已能运行这套后端；正式容量、恢复与隔离仍未证明。先复用现有预览做版本对齐和合成数据验收，再依据高峰内存、OCR、备份及磁盘增长决定升级，不能仅凭最低规格要求先购买第二台服务器。

## 4. Supabase 盘点与路径判断

本轮只读查询了项目区域、函数列表、数据库总体规模、Auth 身份类型、Storage 对象数、扩展和迁移账本，未读取或导出患者正文。云端有邮箱、Google 和匿名账号；Storage 桶存在但对象数为零。远端只列出 `llm-proxy` 与 `medical-document-ocr` 两个活跃函数；本地另有支付函数代码。数据库存在 RLS 策略，但 `supabase_migrations.schema_migrations` 只记录 `001`。抽查当前前端依赖的 `persist_patient_record`、`get_shared_patient_record`、`consume_usage` 和 `save_lab_report_batch`，远端未查到；历史手工 SQL 与迁移账本需逐项对齐，不能直接运行全量 `db push`。

| 路径 | 能立即做的事 | 正式承载健康资料前的门槛 |
| --- | --- | --- |
| 保留官方新加坡 Supabase | 在独立测试环境或纯虚构 Demo 中验证新静态站；继续由平台维护数据库服务。 | 核查跨境处理依据、提供商和 OCR/LLM 流向，实测移动/联通/电信链路；补齐真实版本的数据库 RPC、函数、备份与回调。用户报告当前为 Free，官方价格表未给 Free 包含自动备份；实际用量/账单待后台核验。 |
| 腾讯云境内自托管 | 已确认现有 Firefly 预览就在上海 Lighthouse；复用 `ops/self-hosted/` 固定版本和既有环境核对当前版本。用户愿意长期负责运维。 | 数据库关键 RPC 尚未对齐。当前备份 timer 活跃、最近任务成功，但本轮未恢复。SMTP、Google、AI/OCR、匿名迁移、RLS 行为与国内 HTTPS 入口仍待当前版本验收。 |
| 腾讯云 CloudBase for Supabase 版 | 官方产品页支持上海地域，由腾讯云托管 PostgreSQL、认证、API 等能力；可纳入隔离兼容性评估。 | 不是 Supabase 官方转售，也不承诺全部 API 兼容。官方迁移指南的 SDK、Auth 和用户 ID 类型与当前项目不同；本项目的 UUID 外键、事务 RPC、匿名会话、账号绑定和 Deno 函数必须逐项验证，不能只换 URL。 |

**当前建议：**现有云项目继续维持旧站运行；新站预览只用隔离环境或完全虚构资料。用户愿意负责运维，正式健康资料服务优先准备境内自托管，但以恢复演练、当前版本和功能验收通过为前提。当前官方项目的 `ap-southeast-1` 是新加坡，Supabase [托管地域列表](https://supabase.com/docs/guides/platform/regions)没有中国大陆；所谓“腾讯云大陆 Supabase”是自行把 Supabase 软件部署到腾讯云服务器。服务器地域也不能替代法律与数据流核查。现有自托管细节见[手册](../operations/supabase-self-hosted.md)，[Supabase 自托管责任](https://supabase.com/docs/guides/self-hosting)。

新增核查：腾讯云已有[CloudBase for Supabase 版](https://cloud.tencent.com/product/tcbs)，属于另一条腾讯云托管路线。经现有 UUID 外键、Auth 和函数边界对比，它不是这次迁移的默认选择；[CloudBase 迁移指南](https://docs.cloudbase.net/quick-start/migration/supabase)给出文本类型的 `auth.uid()`、不同认证接口，并要求账号单独导入或重新激活。现阶段保留原版 Supabase，不修改认证合同，不假定兼容托管服务可以无损承接现有账号。

### 2026-10-05 部署选型执行结果

本轮按现有代码选择**复用上海轻量上已经存在的原版 Supabase 预览**作为国内后端实施路线，先不新购服务器或重建后端。理由是保留当前账号、UUID 外键、RLS、事务 RPC 与 Deno 函数，已有 `ops/self-hosted/` 配套。前端以 **EdgeOne Pages 大陆加速**为目标承载 HTML/JS/CSS，API/Auth/病历在上海后端，模型/OCR 的上游另验；新域名须在备案通过后开放。当前新加坡官方项目仍是生产源，旧预览数据不得当作最新生产数据；回退是否可用须在迁移窗口验证。

CloudBase for Supabase 版暂不纳入这次迁移实现。官方指南虽然提供相似查询/RPC，但要求替换 SDK；账号 schema 受平台管理，登录接口、用户 ID 类型和存储接口有差异。本地 `patients`、`profiles`、`usage_events` 等使用 UUID 关联 `auth.users`，`persist_patient_record` 的 `expected_owner_id` 也是 UUID，前端还有 PKCE 回调、密码恢复与跨标签会话行为；因此它会扩大本次改造范围，不能用较低的套餐起价证明整体迁移成本更低。

正式后端资源仍参考 4 核、8GB+、80GB+，并设独立备份，但先用现有预览取得压力和恢复证据。需要增配时优先比较现有轻量升级与新实例，保留已有代理服务及数据，不擅自停止、迁走或清理它们。官方升级规则会涉及关机且不能降级，实际升级报价和操作需单独确认。[轻量升级规则](https://cloud.tencent.com/document/product/1207/51730)。

## 5. 新旧域名和回调对照

`myoncode.com` 尚未购买。下表右列是计划值，不应提前写入生产配置。

| 用途 | 当前 | 新站候选与检查点 |
| --- | --- | --- |
| Web 主站 | `https://firefly.ghibli1024.com` | `https://myoncode.com`；HTTPS、根域名/`www` 取舍、PWA origin 和旧链接跳转分开测试。 |
| Cloudflare 备用 | `https://firefly-isle.pages.dev` | 保留为历史部署入口，确认旧前端与权威后端版本兼容；不默认作为可写回退入口。 |
| Supabase Auth/API | 当前 `*.supabase.co`，另有 `supabase.ghibli1024.com` 自托管预研 | 留云时保持官方地址；自托管时再定 `api.myoncode.com` 和 HTTPS 网关。浏览器 CSP `connect-src`、PWA 敏感域名列表随选择同步核对。 |
| Supabase Edge Functions | 当前 `*.functions.supabase.co` | 留云时继续使用官方函数 URL；自托管时改为实际网关 `/functions/v1`，先核对函数版本。 |
| 应用接收 OAuth 结果 | 代码实际路由 `/auth/callback` | 加入 `https://myoncode.com/auth/callback` 到 Supabase Redirect URLs；旧站还使用时暂留精确旧地址。 |
| 密码重置/邮件链接 | `/auth/reset-password`，邮件链接按运行时 origin 生成 | 加入 `https://myoncode.com/auth/reset-password`；检查确认邮件、重置邮件及过期/错误恢复。 |
| Google 提供商回调 | 官方云为其 `/auth/v1/callback` | 留云时 Google Console 的提供商回调仍指向官方 Supabase；自托管才改网关 `/auth/v1/callback`。浏览器访问 Google 与 Auth 服务出站访问 Google 都要实测。 |
| CORS 与浏览器连接 | 本地 `llm-proxy`、OCR 等函数响应 `Access-Control-Allow-Origin: *`，请求用 bearer token；`public/_headers` 的 CSP 单独限制连接地址。 | 新站 origin 下实测预检、JWT 验证和错误响应。若改为 Cookie 凭据模式，不能沿用通配 origin；CORS 也不能代替后端权限检查。 |
| 网页微信适配 | 旧域名下的 `/api/auth/wechat/*` 预研，尚不可视为已上线 | 个人主体准入和真实网站应用审核未通过前不迁入首发；未来单独选定接口域、存储和回调。小程序 `wx.login` 另走自己的身份接口。 |
| 私有附件 | 当前未见 Storage 对象 | 若后续启用，配置私有存储/签名访问，不把患者文件置于公开静态目录；小程序合法域名按 request/upload/download 分列。 |

DNS 建议使用 DNSPod 免费版，按其最低 TTL 600 秒制作切换单；`www` 的跳转需实际服务支持，不能只新增 DNS 记录。[DNS 版本对比](https://cloud.tencent.com/document/product/302/106264)。

## 6. 浙江个人主体的首发准入

用户已确定：计划使用浙江省个人主体；首发不开放收费会员、公开 AI 解读、药品知识、医生在线诊疗或未成年人资料；登录后的病历提取和报告 OCR 保留。下列“待补条件”不是对资质的最终法律判断。

| 功能 | 当前代码与首发处理 | 必须补的条件 |
| --- | --- | --- |
| 手动病历、治疗线、指标、症状、随访、导出 | 保留为首发候选；实际页面已有。 | 浙江个人网站内容/名称与实际服务一致性、隐私告知、敏感信息处理、账号及 RLS/分享权限验收。 |
| 登录后 AI 提取与报告 OCR | 用户要求保留；代码经 Supabase Edge Functions 调用模型，图片/PDF 内容会进入对应 OCR 上游。 | 逐项确认模型供应商、地域、传输字段、保存期限、用户告知及适用手续；验收失败与人工复核。不能因为前端移到大陆就视为处理已在境内。 |
| 公开 AI 解读 | 首发暂不开放；现有演示含固定 AI 预览，真实页面也有相关功能入口。 | 发布包应有明确入口和接口限制，不能只改宣传文案；以后开放再核查适用规则。 |
| 捐赠/收费 | `/donate` 与 Stripe 函数代码存在，远端未见相应已部署函数；首发暂不开放。 | 发布前处理导航、直接路由与支付接口；未来收费另核主体、支付与经营模式。 |
| 药品知识、医生诊疗、未成年人资料 | 不是本次首发能力。 | 新增前按实际页面和数据处理规则单独评估；不能只靠免责声明。 |
| 小程序 | 尚无独立小程序交付。 | 个人可申请的实际类目能否覆盖肿瘤病历、治疗线、AI 提取与分享，须携真实功能描述由微信审核；个人主体不能依赖 `web-view` 套壳。 |

医疗健康信息属于敏感个人信息。当前隐私页文案较简略，尚未列出模型/OCR 提供者、保存期限、跨境链路、删除与撤回范围，不能直接作为正式健康资料服务的完整隐私告知。个人备案时，腾讯云要求内容符合个人主体，不包含企业、论坛或需前置审批的内容；浙江还要求备案网站名与实际名称一致、未备案网站关站。若身份证地址不在浙江，需核查居住证明。[个人信息保护法](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)、[腾讯云内容要求](https://cloud.tencent.com/document/product/243/19644)、[浙江管局要求](https://cloud.tencent.com/document/product/243/51706)、[备案材料](https://cloud.tencent.com/document/product/243/18914)。

### 浙江个人主体执行口径

按用户确认的浙江个人主体准备网站备案和小程序申请材料，不另设客服预核，也不发送此前的咨询稿。网站和小程序材料如实包含肿瘤病历管理、报告上传、登录后的 AI 提取/OCR、人工复核和授权分享，所需类目与证明按正式申请流程处理。

公开规则作为填写材料的依据：浙江网站名需与实际站名一致；腾讯云个人网站命名规则限制行业及产品信息。微信个人「工具—健康管理」示例为身高、体重等记录，非个人列表另有深度合成 AI 类目，肿瘤资料及 AI 提取/OCR 在正式申请时按实际功能核对。用户选定主体不等于已取得备案号或版本审核结果，技术准备不以事先获得客服回复为前置条件。[浙江备案要求](https://cloud.tencent.com/document/product/243/51706)、[网站命名规则](https://cloud.tencent.com/document/product/243/73180)、[微信服务类目](https://developers.weixin.qq.com/miniprogram/product/material/)。

## 7. 可确认的采购与申请材料

| 项目 | 本轮结果 | 下单/提交前由本人确认 |
| --- | --- | --- |
| 域名 | 腾讯云注册页面当日将 `myoncode.com` 显示为“立即加购”，普通首年 ¥83、续费 ¥90/年；这不是预留，也不是结算价。 | 域名持有人与个人备案主体一致；核对最终购物车、续费价格、可注册状态和商标风险后付款。 |
| 品牌 | 检索“知见”“MYONCODE”“MY ONCODE”“ONCODE”，先看第 9、42 类，再依实际服务核第 44 类及类似群；已知 Oncode Institute 与重庆知见生命科技有限公司是需分析的同业线索。 | 在[中国商标网](https://sbj.cnipa.gov.cn/)做完整近似检索；网络同名线索不能证明侵权或可用。 |
| 备案资源 | 已核实上海四区 Lighthouse 4 核 4GB/40GB，购买期 12 个月、2027-09-04 到期、有公网 IPv4，且已有 Supabase 预览；时间、地域和公网条件与公开备案要求相符。先核本人的备案订单能否选择该实例；正式增配依据后续验收。个人账号不能依赖备案授权码。 | 确认后台实际备案可选状态及实际接入路径；腾讯云要求包年包月累计至少 3 个月，备案期间剩余至少 1 个月。 |
| 个人 ICP 材料 | 网站用途草稿：个人健康资料整理、治疗记录和随访管理工具；不提供医生诊疗、药品信息或收费会员。网站名称按实际“知见”准备，正式流程核对名称要求。 | 姓名/身份证、证件地址、浙江通信地址、联系方式、域名实名、云资源、是否已有备案记录；若证件地址非浙江，按要求准备居住证明。原始证件只在官方后台提交。 |
| 小程序材料 | 与网页分开准备个人主体、名称、真实功能说明、页面截图计划、服务类目、服务器域名和隐私指引草稿。 | 在正式申请中按实际功能选择类目并补充所需材料；完成账号核验、备案和必要认证。 |

备案类型按主体历史选择首次备案或新增服务；新域名不会因为旧站在 Cloudflare 就自动成为接入备案。[腾讯云备案场景](https://cloud.tencent.com/document/product/243/18910)、[备案资源要求](https://cloud.tencent.com/document/product/243/18908)。

## 8. 微信身份验证合同

网页扫码登录与小程序登录分开。个人主体下网页开放平台网站应用资格尚未核实，因此首发先设计小程序的 `wx.login` 链路；现有 Cloudflare 适配层不能当作小程序登录接口。

1. 小程序发起 `wx.login`，只把短时 code 送至自有 HTTPS 服务端。服务端用小程序 AppSecret 调用 `code2Session`，校验错误及 code 一次性使用；AppSecret 不进入前端。
2. 身份表使用 `(provider='wechat-miniprogram', appid, openid)` 的唯一约束指向一个稳定业务用户。`unionid` 只在实际返回且来源可信时存为辅助关联，绝不据此静默合并患者档案。
3. 既有邮箱/匿名用户绑定微信前，要求用户在当前 Supabase 会话中主动确认；冲突时停止绑定并给恢复路径。跨设备再登录须拿到相同 `auth.uid()`，否则现有 RLS 会把它视为另一个账号。
4. 当前项目以 Supabase Auth 为唯一真实会话来源。微信 code 本身不是 Supabase 会话；必须先完成一个隔离的身份桥接验证，证明会话签发、刷新、注销、撤销、匿名升级和 RLS 隔离可用。不能用伪造邮箱/固定密码、浏览器 `service_role` 或仅保存 openid 的表模拟完成登录。若需要外部 JWT 或另建会话体系，先修改行为合同并审核兼容责任。
5. 用合成账号做重放、过期、错绑、跨账号读取和旧用户关联测试；微信后台真实 AppID、认证、合法域名与平台审核齐备后再做真机验收。个人主体不能默认用 `web-view` 完成 OAuth 跳转。

接口设计草案：`POST /auth/wechat/mini/exchange` 收一次性 code，`POST /auth/wechat/mini/link` 在已有会话下绑定，`POST /auth/wechat/mini/unlink` 在复验身份后解绑。三个路径是**待验证合同**，不是已实现 API；响应不得返回 AppSecret 或其他人的账号标识。[微信登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)、[Supabase 自定义 OAuth](https://supabase.com/docs/guides/auth/custom-oauth-providers)、[JWT 与外部身份](https://supabase.com/docs/guides/auth/jwts)。

## 10. 费用与尚缺输入

价格核查日期：2026-10-05，币种分开列示。人民币服务器按腾讯云大陆公开月价和 12 个月 85 折计算；实际活动、套餐库存与续费结算价以订单为准。EdgeOne Pages 按免费额度内 ¥0 估算，函数/KV、超额与备案资源另算。[轻量价格与年付折扣](https://cloud.tencent.com/document/product/1207/73452)、[EdgeOne 免费额度](https://edgeone.cloud.tencent.com/pages/document/162936949996421120)、[Supabase 定价](https://supabase.com/pricing)。

| 费用项 | 首年预算 | 以后每年按当前公开价 | 适用条件 |
| --- | ---: | ---: | --- |
| `myoncode.com` | ¥83 | ¥90 | 普通域名公开价，未下单 |
| EdgeOne Pages 静态前端 | ¥0 起 | ¥0 起 | 免费额度内；不提供单独备案资格的保证 |
| 大陆 Lighthouse 2 核 4GB 前端/接口 | ¥663 | ¥663 | 仅保留官方后端且实际用它承载网站/API 时选用 |
| 已有上海 Lighthouse 4 核 4GB/40GB | 本轮新增采购 ¥0 | 续费管理显示 ¥65/月，按 12 个月单价约 ¥780；实付以续费订单为准 | 当前购买期至 2027-09-04；先核现有负载和备案资格，不能再计一次新购 |
| 大陆 Lighthouse 4 核 8GB 后端 | ¥2,346 | ¥2,346 | 仅境内自托管路线；容量与可用性仍需实测 |
| 独立备份/对象存储 | ¥240–1,200 暂估 | 同左 | 以文件量、版本、出流量和恢复目标重算 |
| Supabase 官方 Free | US$0 订阅费 | US$0 订阅费 | 用户报告的当前套餐；用量限制、备份能力及实际账单待后台核验 |
| Supabase 官方 Pro | US$300 起 | US$300 起 | 仅未来升级 Pro 时；不是当前已发生费用 |
| 个人小程序认证 | 暂预留 ¥30/次 | 续审规则待后台核对 | 登录实现与认证收费分开；最终按微信订单 |

当前能计算的是资源情景，不是实际账单：

- **当前选定的预览路线：**复用既有上海自托管，服务器新增采购 ¥0，EdgeOne 按免费额度内 ¥0 起；域名首年标价 ¥83，独立备份预算暂估 ¥240–1,200/年，尚未购买。现有服务器已预付至 2027-09-04。未来按当前续费管理单价粗算，服务器、域名及暂估备份约 ¥1,110–2,070/年，未含增配、AI/OCR、邮件和人工；这不是正式上线容量或总费用承诺。
- **后续正式容量决策：**现有实例升级差价需取得实际可选套餐报价；若必须独立新购，表中的 4 核 8GB 年价 ¥2,346 是比较基准。现在不预先假定两台服务器，也不按未报价的升级计算总额。当前官方 Free 项目在迁移前保留，订阅基价为 US$0，其他服务用量与后续账单另核。

本轮只读规模检查可用于估算数据迁移工作量。Cloudflare Pages 的 Web Analytics 当前禁用，项目指标页没有可用的静态站访问量；账户当前周期显示的可计费用量为 US$0，不能拿它推算新站流量。仍缺现有腾讯云续费支付页最终报价、真实请求量、OCR/模型调用量和备份保留目标；取得这些数后，才能把上表变成真实首年、续年和并行期总成本。数据库体积很小不等于迁移简单，账号会话、RLS、函数、邮件和恢复验收仍是主要工作量。

## 第一阶段完成与阻塞

本阶段已形成基线、兼容性矩阵、前端候选、后端路径、域名/回调对照、浙江个人主体材料、首发准入表、微信身份合同和[切换操作单](../operations/tencent-cloud-cutover.md)。以下条件决定何时能进入购买/申请及正式开发：

1. 按已选浙江个人主体准备证件/居住条件、域名实名和申请材料；正式提交与核验由本人办理。
2. 用户愿意负责长期运维；仍需以异机恢复演练和告警响应证明自托管可以承载正式服务。
3. 核对已有腾讯云资源的负载、备案可选状态与续费实付价，以及 Supabase Free 用量和 Cloudflare 静态站访问量，再完成真实成本核算。
4. 在隔离环境完成目标后端的数据库版本对齐、微信身份桥接、AI/OCR 数据流和恢复演练。现网缺少当前前端依赖的关键 RPC，不能直接发布本地前端。

上述事项未通过前，采购清单是待确认建议，备案材料是草稿，正式生产切换仍未开始。
