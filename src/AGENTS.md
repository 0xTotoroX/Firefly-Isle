# src/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
AGENTS.md: 说明前端源码层级、模块边界与文档同步规则，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
App.tsx: 路由装配入口，负责 BrowserRouter、ThemeProvider、BackgroundAudioProvider、AuthProvider、PrivacyGate、PWA 离线提示、匿名/非匿名身份标记、公开 /demo 全产品演示、记录页用户归属保存 id、OAuth 公共回调/错误归一与 lazy 加载的 /app、/demo/record、/demo/analytics、/record/:id、/share/:code、/analytics/:id、/analytics/demo 等产品页面路由拼接，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
main.tsx: React 挂载入口，加载 @fontsource latin 子集自托管英文 display/UI/mono 字体 CSS，把 App 渲染到 DOM，并在生产安全上下文注册 PWA service worker，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
index.css: 全局 token、主题变量、safe-area token、localized typography token 与共享布局样式，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
components/: 页面骨架、登录展示层、统计页实验室趋势展示层、病例 dossier 展示层、设计系统壳层基元、主题开关与 UI 组件，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
lib/: 主题状态、背景音乐歌单状态、设计系统 token、认证、隐私文案、PWA 注册/缓存边界、网络在线状态、LLM adapter、信息提取、自然语言编辑、实验室字典/摄入/趋势/批次持久化、患者记录持久化、授权码分享、正式病历导出、结构债测试、Supabase 客户端与通用工具，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
routes/: 登录页、OAuth 公共回调页、隐私条款页、临床工作区、公开 Demo、可选 Supabase share-code Demo 数据源、实验室趋势统计页、档案详情 route 编排/加载逻辑、公开只读分享页页面骨架，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
styles/: Transitions.dev 正式产品共享动效合同；设计评审板独立保存在 docs/design/saas-review，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
types/: PatientRecord 等领域模型与判定工具，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md

法则: 壳层先于业务，主题先于页面，路由只装配不承载细节。
