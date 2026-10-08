# 腾讯云测试、发布与恢复操作单

本操作单配合[第一阶段盘点](../products/tencent-cloud-phase-one.md)使用。各日期记录保留当时状态，当前迁移进度以本文最新条目及控制台/运行验收为准。

## 本次测试环境直接切换（2026-10-06）

用户确认此前未正式投产、全部为可放弃测试数据，授权直接改用上海自托管后端。此分支不导出/同步旧云病历，不套用真实业务数据的源库冻结与增量同步窗口。保留旧库及旧部署供回退，不主动删除它们。

当前入口先保留 `firefly.ghibli1024.com` / Cloudflare Pages，构建接 `supabase.ghibli1024.com`，函数接同域 `/functions/v1`。`VITE_SUPABASE_AUTH_STORAGE_KEY=myoncode-shanghai-auth-v1` 为独立会话空间，不导入旧云/旧预览登录信息；用户重新登录或创建匿名身份。微信占位 provider 为空。

上海 Auth 的 SITE_URL 和 URI allow list 已覆盖当前网址及 Pages 预览，API_EXTERNAL_URL 正确包含 `/auth/v1`；六个核心容器 healthy，当前版本备份已经恢复核验。SMTP 本轮未配置/未验收，Google enabled 不是实际 OAuth 验收通过。当前仅验证测试数据操作，不把本次切换写成正式患者服务上线。

前端迁入腾讯云 EdgeOne 与新品牌域名/大陆直连入口继续单独完成；当前 API 仍经 Cloudflare Tunnel。发布结果及 ID 在自托管手册记录。

## 0. 每次操作前记录

记录执行人、时间、目标环境、Git SHA、旧 Cloudflare production deployment ID、目标腾讯云 deployment ID、后端权威写入端、备份位置和恢复联系人。2026-10-05 的旧站快照为 `0b41a7d` / `dc95230e-85e3-4524-a62c-5231338fd48e`；执行窗口须重取，不能沿用历史值。未拿到旧部署 ID 或后端版本时停止生产发布。不要在操作单或工单中粘贴密钥、患者正文和完整 OAuth code。

```bash
git status --short --branch
git rev-parse HEAD
node --version
npm ci
npm run build
```

检查 `dist/index.html`、`dist/sw.js`、`dist/source/index.html`、`dist/source/source-manifest.json` 存在，manifest 的 `revision` 与要发布的 SHA 相同且 `dirtySnapshot` 为 `false`。构建时需注入已审核的 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 和 `VITE_SUPABASE_EDGE_FUNCTION_URL`；其他私密密钥只放服务端。源码包超过 20 MiB 时生成分卷，清单保留整体与每卷 SHA-256，源码页提供全部下载和拼接方法；不得移除对应源码来绕过 Pages 25 MiB 单文件限制。只跑构建不证明目标环境或后端可用。

## 1. 新站端到端预览

按实际后端位置选择前端承载方式，再建立独立预览。选择 EdgeOne Pages 时使用 Node 22、安装 `npm ci`、构建 `npm run build`、输出 `dist/`；把 `public/_redirects` 与 `public/_headers` 逐项翻译为平台的 `edgeone.json` rewrites/headers。选择 Lighthouse 时配置可信 HTTPS、静态文件服务及 `try_files $uri $uri/ /index.html`，并逐项移植响应头与缓存策略。两条路线都要检查 SPA 路由回退不能吞掉 `/api/`、`/source/`、静态资源和不存在的文件；当前 Cloudflare 微信 Functions/KV 不随前端文件自动迁移。

预览仅使用合成病历和隔离后端。验收记录至少包括：首页、登录、`/auth/callback`、密码重置、`/app`、病历读写、导出、分享过期/撤销、OCR/模型请求、`/source/` 下载；手机窄屏、长病历、空/失败态；HTML 与资源 Cache-Control、CSP、HSTS；PWA 更新及私有响应不缓存。分别记录页面文件下载、Auth/API/RPC、OCR 上游的耗时及失败，连同所用设备、网络、后端版本和截图保存；不能用首页加载速度代表整个应用。预览失败时恢复该测试项目的上一个 deployment，不动旧站。

## 2. 备案和正式域名门槛

浙江个人主体的域名实名、腾讯云账户实名、合格大陆资源和 ICP 备案通过后，再向中国大陆公开 `myoncode.com`。域名与商标风险、网站实际内容、微信个人类目由本人及平台确认。备案期间浙江未备案网站须关站，测试使用平台允许的受控预览方式。`www`、API、邮件及文件域名分开配置；新增 DNS 前核对全部现存记录。免费 DNSPod 的最低 TTL 按 600 秒排期，降 TTL 后至少等原 TTL 周期。[浙江规则](https://cloud.tencent.com/document/product/243/51706)、[备案资源](https://cloud.tencent.com/document/product/243/18908)。

正式发布前在新域名核对证书链、自动续期、HTTPS 跳转、CSP 允许的后端地址、Supabase Redirect URLs 和 Google 提供商回调。改域名会改变浏览器 origin，旧站 localStorage 和 Cookie 不会自动转移；新站重新登录与匿名会话恢复要作为产品验收项。

## 3. 后端准备与数据迁移窗口

若保留官方 Supabase，先取得数据处理和国内网络结论，修正数据库迁移账本与实际结构差异，按[病历完整性发布手册](record-integrity-release.md)核对 RPC 与函数版本。不能依据仓库中 19 份迁移文件直接运行全量 `db push`。验证邮箱/匿名/Google、AI/OCR、RLS、附件、分享及账号删除，确认新旧前端同时连接同一权威后端的兼容性。

若选择境内自托管，先按[自建 Supabase 手册](supabase-self-hosted.md)核对固定版本、资源、SMTP、出口、密钥、对象文件和异机恢复。安排单独维护窗口；先停写、暂停可能继续写入的任务/Webhook，再做一致性导出、导入与全表数量/内容指纹核对。目标接受生产写入之前可以考虑恢复旧后端；目标已有新写入之后，必须先反向同步或向前修复，不能只改前端 URL 或 DNS。旧 Cloudflare 前端此时也只能访问同一个已批准的后端或保持只读。

## 4. 发布与验收

在单独批准的生产窗口，从已验证 SHA 构建并部署目标平台；记录部署 ID、环境变量名称、目标后端版本和操作时间。先以不含真实患者资料的合成账号验收，再按既定权限核对正式登录与读取。至少检查：

| 项目 | 通过标准 | 失败时动作 |
| --- | --- | --- |
| 页面与 PWA | 主路由、窄屏、长记录、更新/刷新、源码包可达；安全头与缓存按设计返回 | 恢复目标平台上一个兼容 deployment |
| Auth | 邮箱确认/密码恢复、可选 Google、匿名会话、跨域重新登录、注销均按预期 | 停止放量，修正回调/邮件/会话；不静默建立新账号 |
| 数据权限 | 两个合成账号互读失败；分享码过期/撤销即时失效；保存后重载一致 | 停止写入或恢复兼容版本，核对 RLS/RPC |
| 模型/OCR | 登录后提取、图片/PDF OCR、人工复核与失败恢复；供应商与数据流符合已确认范围 | 关闭入口或暂停放量，不把真实资料送到未核服务 |
| 网络 | 移动、电信、联通以及至少两个大陆地区，记录首页、Auth、API、文件和模型请求成功率及长尾耗时 | 不以单一办公室网络结果判定全国可用 |
| 监控和恢复 | 告警可达、数据库与对象备份独立、完整恢复演练可重复 | 未满足恢复门槛不开放正式资料服务 |

备案号与公安备案等适用信息按最终批复内容展示；不要预先写入占位备案号。新站稳定观察后，再另行决定旧站关闭与独立迁仓。

## 5. 回退判定

| 发现问题时 | 首选动作 | 不能直接做的事 |
| --- | --- | --- |
| 只有前端代码/缓存故障，后端未变 | 恢复腾讯云上一个与当前后端兼容的 deployment，检查 PWA 缓存更新 | 不把 DNS 切回一个连接旧后端的写入站点 |
| 新域名 DNS/证书错误 | 修正新域名配置，必要时暂停售流并使用预先验证的旧入口 | 不能假定 Cloudflare 根域名在 DNS 离开后可立即接回 |
| 后端尚未接受新生产写入 | 按自托管手册核对源库停写解除和旧前端版本，恢复旧权威端 | 不让两个数据库同时接收写入 |
| 后端已接受新生产写入 | 暂停新增写入，核对增量并制定反向同步或向前修复 | 不只改 DNS、`VITE_SUPABASE_URL` 或恢复旧库快照 |

每次回退记录触发证据、数据写入边界、执行人、版本和复验结果。Cloudflare 旧环境保留到用户另行确认退出。[Cloudflare Pages 自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)、[EdgeOne 配置文件](https://edgeone.cloud.tencent.com/pages/document/162936771610066944)。

## EdgeOne 前端构建与凭据准备（2026-10-06）

当前腾讯云中国站的 Pages 已更名为 Makers；服务已在同一账号免费开通。`edgeone.json` 迁入原 `_headers` 的安全头与缓存规则，显式列出应用路由，保留真实静态文件/源码下载并让不存在的 `/api/` 和静态文件返回 404。`npm run build:edgeone` 在本机 Node.js 22 从 wrangler 读取已审核的公开 VITE_ 配置，构建 dist 后附带仅包含路由与响应头的平台配置；上传包不要求腾讯云重新安装依赖或运行编译。首轮平台拒绝精确 Node 22.23.3 后已移除该无关配置；它不复制 Cloudflare 微信 Functions，也不读取服务端 Secret。

备案前的验证项目选全球可用区（不含中国大陆）；大陆节点与新品牌域名待实名/备案后接入。当前 Cloudflare 入口继续保留。部署目录包括源码分卷及原许可通知，每个文件必须小于平台 25 MB 限制。

Google 实测已通过浏览器选账号与上海回调，但令牌交换返回 `invalid_client`；服务器仅输出状态码与错误名的诊断也得到 HTTP 401 / invalid_client。当前不是 redirect_uri_mismatch，不能再把配置项存在等同于可登录。服务端 `GOOGLE_SECRET` 需有效原始 OAuth Client Secret；不能用摘要或不同客户端的 Secret。凭据验证完成前，本地部署变量 `VITE_GOOGLE_OAUTH_ENABLED=false` 让按钮明确暂不可用；匿名和已有邮箱密码登录继续按原合同工作。

原始 Secret 只可保存到服务器 `/opt/firefly-supabase/.env` 的 `GOOGLE_SECRET`，不发聊天、不写入 VITE_ 或 Git。若没有原始 Secret，需要本人在对应 Google Cloud 客户端生成新 Secret 并保存；更换身份凭据由本人完成。保留现有已授权回调 `https://supabase.ghibli1024.com/auth/v1/callback`；新 API 域名以后实际启用时再加该域回调，不能提前填成已上线。

SMTP 仍按用户决定本轮未配置/未验收。域名买好后核验邮件供应商资格和价格，再准备发信域名、发件地址及 SPF/DKIM/DMARC；供应商 SMTP host/port/user/password 只填服务器 .env。不开启邮件自动确认来绕过邮件链路，也不自行发送邮件测试。

微信小程序与网页扫码的独立凭据、申请材料和唯一 Supabase Auth 登录方案见[微信登录接入准备](wechat-login-preparation.md)。域名购买、身份材料、人脸/扫码/验证码和平台审核由本人办理；其他构建、路由、回调与合成验证由 Agent 执行。

官方依据：[EdgeOne 配置](https://pages.edgeone.ai/zh/document/edgeone-json)、[免费版价格](https://pages.edgeone.ai/zh/document/pricing-and-plans)、[限制与配额](https://pages.edgeone.ai/zh/document/limits-and-quotas)、[Google OAuth 凭据与错误](https://developers.google.com/identity/protocols/oauth2/web-server)。

平台的纯项目默认回退实测曾把缺失 /api 和静态文件变成 HTML 200，即使已列显式 rewrites。build:edgeone 现生成仅用于路径保护的 middleware.js：公开文件列表中不存在的资源和本项目未实现的前端 /api 返回 404；不读取 JWT、账户或病历正文。真实资产、源码分卷和 /login 仍继续正常处理。

PDF worker 的 .mjs 文件在腾讯云默认返回 application/octet-stream，实测造成模块 worker 无法加载。平台配置已显式将 /assets/*.mjs 返回为 text/javascript，不放宽 CSP、不改成 CDN 解析。

## 腾讯云项目实际结果

项目为中国站 `makers-zbjwzs1yfrhl`，名称 myoncode，区域全球可用区（不含中国大陆）。第一次上传因 Node 精确版本被拒，第二次静态上传成功；进一步 HTTP/浏览器验收发现的 SPA 缺失资源回退和 PDF worker MIME 已修复。最终部署 ID `dpxf1bqnqhhq`，对应源码 `b0404ff61a613a63bd55721e4c196b08d981d50a`；项目入口为 `https://myoncode-7xyqbwsq.edgeone.dev`，版本入口为 `https://myoncode-dpxf1bqnqhhq.edgeone.dev`。平台 production 标签仍指本轮测试网站，不代表正式患者服务已上线。

实测 `/login`、`/auth/reset-password`、公开源码清单返回 200，缺失 `/assets/missing-file.js` 与 `/api/missing` 返回 404；PDF 模块 worker 返回 text/javascript。公开源码清单与最后部署版本、干净快照一致。腾讯云页面已使用上海匿名 Auth、提取、保存与刷新；合成记录在服务器按唯一 ID 核验并清理。最终 PDF 修复的浏览器复验另在本轮证据目录记录，不拿初次失败当成功。

旧 Cloudflare 地址本轮同步发布了 Google 暂不可用提示，当前部署 `026c4d70-3ed7-48aa-90b7-28aa581fe36c` 对应 b77967e；保留它作为已有入口。域名买好后才配置对应 CNAME/HTTPS/备案与大陆加速节点，不提前修改现有 DNS。

最终版本的两页合成 PDF 已在真实腾讯云页面完成识别，返回两页日期、WBC 5.0 和 CEA 6.0 并进入人工确认。浏览器复验实际调用 DeepSeek，初次失败的版本不纳入通过依据。760 项全量回归、类型检查、相关 lint、本机构建与平台部署均通过。

最终版本另外完成了合成记录的提取、保存、详情读取和刷新验收；服务器按唯一 ID 确认该记录实际位于上海，并在登出后清理本次匿名身份及记录。两轮腾讯云临时验收账户均已清理，未操作其他账户。最终源码五卷已从腾讯云公开入口下载并核验每卷及整体 SHA-256。


## 2026-10-08 仓库与腾讯云发布切换

用户目标为前后端全部使用腾讯云、仓库更名与 myoncode.com 域名切换。GitHub 仓库已原地更名为 `0xTotoroX/myoncode`，本地 origin 已同步；Issues/Stars/历史继续保留。本地实际目录已改为 `/Users/Totoro/Documents/Projects/myoncode`，旧 Firefly-Isle 路径仅为兼容符号链接，两个路径指向同一份 checkout，现有 license worktree 引用已核对。Codex 保存的项目名称/路径尚未同步，不能通过 Computer Use 修改 Codex；不编辑 CODEX_HOME 或聊天数据库。包名与锁文件同步为 myoncode；账号导出、缓存、会话键和原生 appId 不随仓库改名迁移。

公开构建变量已从 wrangler 移到 `config/frontend.json`；`build:edgeone` 与 CI/CD 共用这一份值。CD 已改为 EdgeOne CLI 1.6.41 上传预构建 dist 到现有 myoncode 项目，要求 `EDGEONE_PAGES_API_TOKEN`；正式运行成功须另记 deployment ID，配置改动不能称为已发布。旧 Supabase Cloud 发布工作流移除，后端使用上海自托管手册。

控制台实时核对：域名已注册/实名，已在现有 Makers 项目添加 myoncode.com，并通过 DNSPod TXT 归属验证；尚未添加网站访问 CNAME/A。腾讯云审核通过、工信部短信已核验，当前为管局审核中，提交管局时间 2026-10-08 16:30:44。页面预计约 7 个工作日，最多 20 个工作日；这是平台估计，不是获批承诺。未获备案号前不启用此次备案网站的新域名。[腾讯云说明](https://cloud.tencent.com/document/product/243/53142)

上海 Auth 的回跳名单已增补 myoncode.com、www.myoncode.com 和现有 EdgeOne 预览源，保留旧网址/本地回跳；只重建 auth，签名密钥、数据库和会话身份未改变。配置备份位于服务器 `/var/backups/firefly/myoncode-domain-cutover/`，不入 Git。

独立反代配置已准备于服务器 `/opt/myoncode-proxy/`，仓库模板为 `ops/self-hosted/Caddyfile.example` 与 `docker-compose.proxy.yml`。Caddy 2.10.2 配置校验通过；临时回环 HTTP 验证中，携带 anon key 的 Auth health 为 200、无 key 的 REST 为 401，根路径、Auth admin、pg/mcp 为 404。临时测试容器已清理；正式 80/443、证书、新域名入口尚未启用，不把这项配置验收当成 HTTPS 生效。

### 域名获批后的实际切换

1. 在 DNSPod 将 `api` A 记录指向现有上海服务器，核对公网安全组 TCP 80/443，启动独立 Caddy 并验证可信证书与允许/拒绝路径；网关 54321、数据库、Studio 和管理端口继续保持私网。
2. 备份私有配置，将 SITE_URL 改为 `https://myoncode.com`、SUPABASE_PUBLIC_URL 改为 `https://api.myoncode.com`、API_EXTERNAL_URL 改为 `https://api.myoncode.com/auth/v1`；保留已审核回跳名单。只对 auth/api-gw/functions/storage 应用配置，不重建数据卷或换签名材料。
3. 更新 `config/frontend.json` API/函数 URL，显式同步 CSP、PWA 敏感域名判定和相关测试；使用新 API 完成匿名/密码、刷新、保存、OCR/AI、分享/导出合成验收。新站源下需重新登录，已有账户和数据库保留。
4. 在 Makers 添加正式域名，按其返回的实际 CNAME/TXT 配置 DNS 与托管 HTTPS，发布当前干净修订，核对对应源码和部署 ID；大陆加速须在备案获批后单独验收。
5. 验证实际 myoncode.com 页面及所有后台请求均不经 Cloudflare；完成后才将旧 Cloudflare 网站退出主入口。共享 cloudflared 还服务其他项目，不停整个共享进程；旧入口的退出和回退按具体路由处理。

Google 的新 API 回调另需 Google Cloud 授权，SMTP 仍未验收；它们的当前能力不因域名切换自动变为可用。回滚保持同一个上海数据库，恢复原 URL/前端版本即可；不回滚数据、不删除旧环境。


本轮本地验证：Node.js 22.23.3，lint、完整类型检查和腾讯云构建通过。全量首轮 758/760 通过，两项 Demo 首次懒加载在并发下超过 1 秒；定向 15 项及限定 4 workers 的完整 760 项复验通过，未改断言或产品代码。反代配置与真实回环路由验证通过，Auth 重建后 healthy。发布 Token 的一年有效期表单已准备，尚未创建/配置；Makers CLI 登录停留在完成登录页面，未当作已认证或已部署。


### 新 API 域名的前端安全准备

在实际启用 api.myoncode.com 前，两平台 CSP 已加入该精确 HTTPS 源，并继续允许旧 API；PWA helper 与实际 worker 均将新域识别为敏感远端。已扩展原有安全头合同，同时覆盖腾讯云 edgeone.json 与 Cloudflare _headers；真实 worker 事件验证新旧 Auth/REST/functions 不被拦截或写入缓存。公开前端配置仍使用原上海 API，尚未切换网络流量。

Makers 域名归属验证后，控制台已返回 CNAME `myoncode.com.pages.dnsoe4.com`，当前状态为“请添加 CNAME”；访问解析与 HTTPS 尚未配置，待备案获批后执行。
