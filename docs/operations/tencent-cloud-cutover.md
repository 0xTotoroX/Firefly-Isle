# 腾讯云测试、发布与恢复操作单

本操作单配合[第一阶段盘点](../products/tencent-cloud-phase-one.md)使用。以下命令及核对项用于以后具备账号、域名、备案和目标环境时逐项执行；本轮只完成本地构建与只读盘点，没有创建腾讯云站点、改变 DNS、迁移数据或发布生产。

## 0. 每次操作前记录

记录执行人、时间、目标环境、Git SHA、旧 Cloudflare production deployment ID、目标腾讯云 deployment ID、后端权威写入端、备份位置和恢复联系人。2026-10-05 的旧站快照为 `0b41a7d` / `dc95230e-85e3-4524-a62c-5231338fd48e`；执行窗口须重取，不能沿用历史值。未拿到旧部署 ID 或后端版本时停止生产发布。不要在操作单或工单中粘贴密钥、患者正文和完整 OAuth code。

```bash
git status --short --branch
git rev-parse HEAD
node --version
npm ci
npm run build
```

检查 `dist/index.html`、`dist/sw.js`、`dist/source/index.html`、`dist/source/source-manifest.json` 存在，manifest 的 `revision` 与要发布的 SHA 相同且 `dirty` 为 `false`。构建时需注入已审核的 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 和 `VITE_SUPABASE_EDGE_FUNCTION_URL`；其他私密密钥只放服务端。只跑构建不证明目标环境或后端可用。

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
