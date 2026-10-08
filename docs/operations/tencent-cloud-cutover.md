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


## 2026-10-09 腾讯云当前版本发布

当前腾讯云部署 `dp2uk8uju94o` 对应干净源码 `2f2a4e54a8110a63278c59d9d48242de368c86c9`，通过现有账号控制台上传预构建 ZIP 完成；固定入口仍为 `https://myoncode-7xyqbwsq.edgeone.dev`，版本入口为 `https://myoncode-dp2uk8uju94o.edgeone.dev`。自动 CD 尚待用户确认创建 Makers Token 并配置 GitHub Secret，手动发布不代表自动 CD 已验收。

现场验收：首页、login、Demo、公开源码清单均 200；`/api`、`/api/missing`、缺失脚本均 404；PDF worker 为 text/javascript。公开清单修订精确匹配已部署源码、dirtySnapshot=false；CSP 包含新旧两个精确 API 源，Demo 浏览器渲染成功且未见控制台 error。新 API 的隐私/CSP 准备通过 28 项相关测试、类型检查和 lint；路由匹配修复通过 11 项行为测试、相关 lint 与构建，两次代码提交的 GitHub CI 均成功。

前一次 `dp4q697k7q2n` 已成功发布 d81930a，但平台日志显示 matcher 配置提取失败并使用默认全路径匹配。原因是其编译器的配置提取正则要求 config 对象闭括号独占新行；生成器改用多行对象后，最终日志正确读取六条 matcher，未再出现该警告，真实 404 路由复验通过。

当前页面依旧连接上海后端的旧 API 域名，该域经 Cloudflare Tunnel；正式根域与 api 子域的访问解析尚未设置，备案仍为管局审核中。此发布只完成腾讯云前端当前版本，未完成新域名和后端 HTTPS 直连切换。服务器代理配置、Auth 回跳补充与后续实际切换仍按本操作单执行。

控制台 AX 读取曾持续超时，但同一浏览器的标签列表与受支持 DOM 操作有效；恢复现有标签后使用 DOM 完成发布。读取超时不是部署失败的证据，不据此重启或重复提交同一部署。


## 2026-10-09 先跑通技术流程

用户明确要求先完成技术流程、备案内容后补。当前 Makers 仍使用全球可用区（不含中国大陆）；其自定义域名不以 ICP 获批为前提。上海 API 的域名解析可能被未备案监测拦截，因此阶段测试采用腾讯官方允许的公网 IP 访问，保留 api.myoncode.com 作为后续域名入口。[Makers 自定义域名](https://cloud.tencent.com/document/product/1552/127404)、[腾讯云 IP 测试说明](https://cloud.tencent.com/document/product/243/19630/)

独立代理已升级并启动为 Caddy 2.11.7，使用 `Caddyfile.ip.example`、显式公网 ACME shortlived profile、默认 IP SNI、HTTP-01 和持久证书卷。Let’s Encrypt 已为 118.89.86.27 签发公开可信 IP SAN 证书，期限为 2026-10-08 15:30:55 至 2026-10-15 07:30:54 UTC；Caddy 已取得 ARI 续签信息，保持运行自动续签。使用正常 TLS 校验的服务器回环请求返回 404；没有使用自签或关闭证书校验。[IP 证书说明](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability)

通过同一代理和正常证书验证，服务器内的密码登录、同身份刷新、真实模型提取、人工复核格式后的病历事务保存/读回、四种私有路径拒绝及登出共 10 项通过。该证据覆盖服务器内部链路，不等同于公网浏览器全流程验收。临时合成账号和记录仅用于后续浏览器检查，私有 fixture 位于服务器 `/opt/firefly-supabase/releases/myoncode-ip-flow/`，文件 600，不进入 Git；验收结束后按其中唯一 ID 清理。

现场定位公网 HTTPS 不通：上海实例防火墙当前只有 TCP22、TCP80 与 ICMP 三条规则，未放通 TCP443。主机 INPUT ACCEPT、Caddy 已监听443，物理网卡单连接测试也在公网 TCP connect 阶段超时。新增仅 TCP443 的确认已向用户提出，尚未保存；没有使用一键放通或改变数据库/管理端口。

myoncode.com 的 CNAME 一键添加已准备，保存时平台要求本人微信 MFA，尚待用户完成。当前公开前端仍连接旧 API；IP 的 CSP、缓存敏感边界和独立会话初始化准备已通过 38 项相关测试、应用/工具类型与相关 lint。只有公网 HTTPS 与正式前端域名可达后，才切实际 URL 并完成浏览器验收；备案不是本阶段配置工作的停止条件。

### EdgeOne CLI 与域名 HTTPS 进展

用户允许安装所需 EdgeOne CLI，已安装官方 `edgeone@1.6.41`，通过中国站正常浏览器登录；CLI 实测返回账号 Totoro，并已 link 到现有 `makers-zbjwzs1yfrhl`。官方登录会自动创建或复用名为 `edgeone-cli-auto-generated` 的访问 Token，本机认证目录限制为 700、文件为 600；不能将其称为仅浏览器 Cookie、临时 Token 或一年有效期 Token。没有将本机 Token 复制到 GitHub，`EDGEONE_PAGES_API_TOKEN` 仍未配置。

本机普通 CLI 请求曾因网络路径超时而误报未认证，使用仅对当前命令生效的 `NODE_OPTIONS=--dns-result-order=ipv4first` 后成功。不要据此重新登录、全局修改 DNS/代理，或重复创建凭据。CLI 生成的 `.env` 与 `.tef_dist/` 已纳入忽略规则，认证和 link 状态继续使用原有 `.edgeone/` 忽略边界。发布到现有项目使用：

```bash
NODE_OPTIONS=--dns-result-order=ipv4first edgeone makers deploy ./dist \
  --name myoncode --env production --area overseas \
  --skip-ai-gateway-sync --json
```

该命令上传已构建产物；已有项目按名称复用，`--area` 不会改变既有项目区域。当前项目仍为全球可用区（不含中国大陆）。`--skip-ai-gateway-sync` 避免此次静态发布另行写入 AI Gateway 凭据。人工 CLI 发布与 GitHub 自动 CD 分开验收。

DNS 实测确认 `myoncode.com` 已指向 `myoncode.com.pages.dnsoe4.com`，HTTP 返回 EdgeOne Makers 页面。控制台已提交自动验证方式的免费 HTTPS 证书配置，状态为“证书申请中”；证书实际签发及正常 TLS 访问仍需复验。最新代码 `40212a9d50a93707a19c57eca52b41a506cc1382` 的 GitHub CI run `37812965449` 已通过。公网 API 443 的授权确认仍待用户答复，前端 API URL 尚未切到 IP。

### CLI 实际发布与新域名验收

官方 CLI 已成功上传并发布到现有 `makers-zbjwzs1yfrhl`，deployment ID 为 `dprlcou3bvwh`，实际构建源码为干净的 `eca997c68296313f9aaa6c71e1a93ed857044ae6`。固定平台入口仍保留，当前新主入口为 `https://myoncode.com`；GitHub 仓库 homepage 已同步新域名。CLI 的成功 JSON、构建日志和实际浏览器截图保存在本机忽略的 `output/tencent-cutover-20261008/`，没有把认证信息写入仓库。

Makers 自动证书已部署，控制台域名为“已生效”。2026-10-09 01:53（北京时间）正常 TLS 探针及两个公开解析地址均返回 HTTPS 200；证书由 TrustAsia DV TLS RSA CA 2025 签发，SAN 为 myoncode.com，期限至 2027-01-06 07:59:59（北京时间），平台显示到期前 15 天自动更新。Chrome 在新域名真实渲染首页和固定虚构 Demo；没有绕过安全警告或关闭证书验证。强制 HTTPS 的 302 配置已保存，实际 HTTP 返回 302、Location 指向 https://myoncode.com/。

新域名公开源码清单与本地 dist 字节级一致，精确匹配该部署修订且 dirtySnapshot=false；五卷共 89,864,690 字节，逐卷长度/SHA-256 和整体 SHA-256 全部匹配，整体摘要为 `6e5ffcdf5181b576bb8ff0cd2770207e0bae89253f5856f9de33826982fc3b10`。11 项 HTTP 检查通过：正常页面、源码与许可 200，缺失 API/资源 404，PDF worker 为 text/javascript；478 项源码路径未包含真实 .env、认证目录或运行/私有产物。完整核验记录为 `tencent-cli-source-verified.json`。

前端仍使用原上海 API 域名并经过 Cloudflare Tunnel。独立 IP 代理已有可信证书和内部业务链路验证，公网 TCP443 规则已填写为仅全部 IPv4 → TCP443 → 允许，尚未保存，等待新增公开访问范围的明确确认。下一步是在确认后放行、切换公开 URL 并进行真实浏览器登录/提取/复核/保存/刷新；不能用新前端发布或服务器内部验证代替全部流量脱离 Cloudflare 的验收。自动 CD 的 GitHub Secret、Google 和 SMTP 保持各自未验收状态。

### 待发布的 IP 直连配置

下一版公开构建配置的 API 与 functions URL 已准备为 `https://118.89.86.27` 和同域 `/functions/v1`，保留原公开 anon key、独立会话存储键和 Google 暂不可用设置。此改动用于准备匹配后端的待发布产物；线上仍为 `dprlcou3bvwh` / `eca997c`，继续连接旧 API，不能因仓库配置已改就称实际流量已切换。

保存 TCP443 规则前仍须取得已提出的明确确认；规则实际可达后，再备份并更新上海 Auth/API 的公开 URL，验证可信公网 TLS、允许/拒绝路径及核心业务。只有这些条件通过，才发布本版 dist 并在新域名浏览器验收。不要直接运行自动 CD，GitHub Secret 尚未配置；不要发布到未通的 API 或停止共享 cloudflared。
