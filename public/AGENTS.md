# public/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
icon.ico: 旧版时间线脉冲品牌 icon 多尺寸容器，保留作历史兼容但不再由 index.html 作为当前 favicon 引用
logo-island-lighthouse.svg: 岛屿微光灯塔方案的 standalone SVG 容器，内嵌当前 PNG 以保证像素级一致而不做失真的矢量描摹
logo-island-lighthouse.png: 从生成板第 1 案“岛屿微光灯塔”直接裁取并重建透明背景的 1024x1024 PNG 品牌 mark，为沿用的过渡图标；新品牌候选未确认
logo-island-lighthouse.webp: 由当前 PNG 以 lossless WebP 转出的透明品牌 mark，用于现代 Web 轻量加载场景
logo-island-lighthouse.ico: 由当前 PNG 多尺寸封装的 ICO 品牌 mark，包含 16/24/32/48/64/128/256 图标尺寸用于 favicon/系统入口
manifest.webmanifest: PWA 安装 manifest，定义知见 / MyOncode 展示名称（安装 identity 保留）、启动 URL、display、主题色与公开图标集合
material-symbols-license.txt: 随应用分发的 Material Symbols 图标字体版权与 SIL OFL 1.1 许可。
sw.js: 隐私优先 service worker，仅缓存规范公共壳与构建资产；源码/许可文档直接获取，不替换成SPA缓存壳；授权码、认证参数及患者 ID 不写入缓存元信息。
icons/: PWA 安装图标目录，保存由当前品牌 mark 生成的普通、maskable 与 Apple touch icon 静态资产
audio/: 背景音乐公开静态资源目录，保存全局背景音控制器消费的本地授权音频资产、tracks 占位目录与授权边界说明
login/: 登录页专用静态视觉资产目录，保存从 V3 设计图提取并重建的人体背景、夜航/花路灯塔卡片素材与双主题扁平海岸全屏背景
_headers: Cloudflare Pages 响应头配置，收敛静态缓存与基础安全头
_redirects: Cloudflare Pages 精确 SPA 回退规则，确保 `/login`、`/auth/callback`、`/app` 与 `/record/*` 等前端路由刷新可落回首页资源

法则: public 只放可直接发布的静态产物与 Pages 平台配置，不混入源码逻辑。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
