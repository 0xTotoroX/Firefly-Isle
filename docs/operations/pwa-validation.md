<!--
[INPUT]: 依赖 OpenSpec change add-cross-platform-pwa-foundation、public/manifest.webmanifest、public/sw.js、public/_headers、public/_redirects 与当前 Cloudflare Pages 发布链路。
[OUTPUT]: 提供 PWA foundation 发布前手动验证矩阵、缓存隐私检查与回滚步骤。
[POS]: docs/operations 的 PWA 跨平台验证 runbook，服务 Web-first 安装体验与后续 Capacitor 壳层前置验收。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# Firefly-Isle PWA 验证矩阵

这份清单只验证 PWA foundation。它不代表已完成 Capacitor、Electron、Tauri、React Native、Flutter、小程序或鸿蒙版本。

## 1. 平台矩阵

| 平台 | 安装入口 | 必验链路 | 结果 |
| --- | --- | --- | --- |
| 桌面 Chromium | 浏览器安装按钮 | manifest、冷启动、刷新 `/demo/record`、`/share/:code`、PDF/PNG 导出 | 待验 |
| 桌面 Safari | Dock/Add to Dock 能力按系统版本记录 | manifest、刷新深链路、导出、隐私门控 | 待验 |
| iOS Safari | 添加到主屏幕 | safe-area、登录页、Demo、分享只读、文件上传入口 | 待验 |
| iOS 主屏幕 PWA | 主屏幕图标启动 | 冷启动、`/auth/callback`、`/demo/analytics`、离线壳 | 待验 |
| Android Chrome | 安装应用 | manifest、Demo、上传、分享复制、弱网反馈 | 待验 |
| Android installed PWA | 已安装图标启动 | 深链路、统计页、记录页、离线壳 | 待验 |

## 2. 2026-10-03 真实部署回归

Cloudflare 独立预览已实际发布，正式主站未切换。`212f9097` 预览在现有 Chrome 中关闭普通 HTTP 缓存后断网，首次未访问的 Demo 病历仍能从 Cache Storage 加载，且显示需要联网的提示。访问合成 `/auth/callback?code=...` 与 `/share/...` 后遍历全部缓存键和 `Response.url`，78 项中没有合成凭据。旧的仅检查 key/关键词的验收不足以证明响应元信息安全。

最终 `7c26b26f` 构建另经两版本验收：A 控制旧标签，带不同资源名和页面标题的 B 测试构建 `6ee41bb4` 安装等待；新标签继续使用 A，关闭 HTTP 缓存并断网后仍可打开此前未访问的病历，图标字体可用。关闭所有 A 标签后，新标签使用 B 脚本且只剩 B 缓存。B 仅为受控更新测试产物，交付预览恢复正式构建。

`vite.config.ts` 使用 [Workbox getManifest](https://developer.chrome.com/docs/workbox/modules/workbox-build) 从实际构建生成 HTML、JS/CSS/woff、manifest 与图标清单，内容及 worker 源码共同决定版本；固定 URL 的安装请求强制刷新 HTTP 缓存。初次安装完成后接管；更新不强制 `skipWaiting`，待旧版本标签关闭后激活、清理旧缓存。旧 worker 始终返回同版本的规范 HTML 壳，避免新版 HTML 与旧懒加载资源混用。后台业务数据、含查询参数的静态请求和路由导航元信息均不预缓存。图标沿用 Material Symbols，以 Fontsource 本地字体随构建发布，避免断网时显示图标英文名称。

固定导出布局规则已移至应用 CSS。在实际返回严格 CSP 的 `b09037f2` 预览中触发 PDF 导出，按钮完成且浏览器未记录 CSP 拒绝；Chrome 下载事件未返回文件路径，因此本轮远端 PDF 文件落盘/逐页检查仍未确认。此前本地 2 页与 3 页 PDF 的证据只代表对应本地构建。

2026-05-17 本地预检（历史记录）：

2026-05-17 使用 production build + Vite preview + Playwright Chromium 完成预检：

- `npm run build` 后确认 `dist/` 包含 `manifest.webmanifest`、`sw.js`、`_headers`、`_redirects` 与 PWA icons。
- `http://127.0.0.1:4173/manifest.webmanifest` 与 `/sw.js` 返回 200，manifest 声明 standalone、scope/start URL 与 normal/maskable icons。
- 390x844 视口打开 `/demo/record`，隐私门控、Demo banner、侧栏恢复入口和主要操作无文本互相遮挡；移动侧栏恢复按钮热区为 44px。
- 刷新 `/auth/callback`、`/demo/record`、`/demo/analytics`、`/share/invalid_code_123456` 均返回 200 并进入 SPA，不出现 404。
- Service worker 注册到 `/sw.js`，Cache Storage 只出现 `firefly-pwa-v1-static`；缓存条目未命中患者表、授权码、Supabase Auth、Cloudflare `/api`、LLM 或 OCR 关键词。
- 在线二次访问后断网刷新 `/demo/record`，页面显示网络不可用提示并复用缓存 shell，不伪造在线医疗动作成功。

真机 Safari、iOS 主屏幕 PWA、Android Chrome 与 Android installed PWA 仍需在发布前按平台矩阵手动验收。

## 3. 远端配置探测记录

2026-05-17 完成只读远端配置探测，未发布、不修改远端：

- `npx wrangler whoami`：当前 OAuth 账号为 `ghibli1024@gmail.com`，Cloudflare account 为 `Totoro`，具备 Pages write scope；Wrangler 提示缺少与本次 Pages 发布无关的新增 OAuth scopes。
- `npx wrangler pages project list`：存在 `firefly-isle` 项目，域名为 `firefly-isle.pages.dev` 与 `firefly.ghibli1024.com`。
- `npx wrangler pages deployment list --project-name firefly-isle`：最新 Production deployment 指向 `main` 的 `cbf2d14`。
- `supabase functions list --project-ref irkjblpzmclqekxbexll`：`llm-proxy` 与 `medical-document-ocr` 均为 ACTIVE。
- `supabase secrets list --project-ref irkjblpzmclqekxbexll`：必要 secrets 以 digest 形式存在，本文档不记录任何明文 secret。
- `curl -I https://firefly.ghibli1024.com/` 返回 200；但 `/manifest.webmanifest` 与 `/sw.js` 当前仍返回 `text/html`，说明本地 PWA 改动尚未发布到生产域名。

## 4. 主链路验收

- 安装发现：浏览器能识别 `manifest.webmanifest`、图标、standalone display。
- 冷启动：已安装 PWA 从图标启动后进入现有根路由，不出现平台专属业务路由。
- 深链路刷新：`/auth/callback`、`/demo/record`、`/demo/analytics`、`/record/:id`、`/analytics/:id`、`/share/:code` 刷新不 404。
- 隐私门控：首次启动仍展示隐私条款门控，确认前不进入主功能。
- Demo：公开 `/demo/*` 不要求 Supabase session。
- 分享：`/share/:code` 只读，不出现编辑、保存、删除或 AI 分析动作。
- 上传：`/app` 文件上传能打开浏览器文件选择并进入 OCR 文本确认链路。
- 导出：`/record/:id` PDF/PNG 在支持浏览器中完成；不支持时显示可读失败。
- 离线：断网后展示网络不可用提示；登录、匿名会话、OCR、AI、保存、分享读取和统计刷新不伪成功。

## 5. Cache Storage 隐私检查

在 DevTools Application 面板检查 Cache Storage：

- 允许出现：`/`、`/assets/*`、`/manifest.webmanifest`、`/icons/*`、`/login/*`、公开品牌图标。
- 不得出现：患者姓名、授权码、`patients`、`treatment_lines`、`lab_results`、`record_shares`、Supabase Auth 响应、`llm-proxy` 响应、`medical-document-ocr` 响应、`/api/auth/wechat/*` 响应。
- 同时检查缓存键、匹配响应的 `url` 与正文；改成 `/` 键不能抹掉 `Response.clone()` 的原始地址。
- 新版本应先完成资源安装；关闭旧版本的所有标签后重新进入，确认新版激活且旧 `firefly-pwa-*` cache 被清理。

## 6. 回滚

若 PWA 缓存造成线上异常：

1. 发布一个禁用 service worker 注册的版本。
2. 保持 `/sw.js` 可访问，并让它在 `activate` 中删除旧 `firefly-pwa-*` cache。
3. 确认 Cloudflare Pages `_headers` 仍对 `/sw.js` 使用 `max-age=0, must-revalidate`。
4. 让用户刷新或重新打开 PWA，使新 worker 接管并清理旧缓存。
