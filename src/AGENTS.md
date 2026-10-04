# src/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
App.tsx: BrowserRouter 与公开/账户路由边界；Demo 使用独立内存会话和不持久化偏好，真实页面挂载 AuthProvider/PrivacyGate，所有页面复用 lazy 组件与错误护栏。
main.tsx: React 挂载入口，加载 @fontsource 自托管图标及英文 display/UI/mono 字体 CSS，把 App 渲染到 DOM，并在生产安全上下文注册 PWA service worker
index.css: 全局 token、主题变量、safe-area token、localized typography token 与共享布局、CSP 兼容的导出副本样式
components/: 页面骨架、登录展示层、统计页实验室趋势展示层、病例 dossier 展示层、设计系统壳层基元、主题开关与 UI 组件
lib/: 前端客户端与业务逻辑：病历在 records/，化验在 labs/，工作台状态在 workspace/；LLM 与主题 token 分属 llm/、theme/。
routes/: 登录、公开 Demo、工作区、病历、指标、症状、随访、设置、模型与分享页面；Demo 在各服务边界选择内存实现。
styles/: Transitions.dev 正式产品共享动效合同；视觉设计评审资料位于 docs/design/，不参与运行依赖
types/: PatientRecord 等领域模型与判定工具

法则: 壳层先于业务，主题先于页面，路由只装配不承载细节。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。

升级兼容：React Router 7 保留受保护路由、患者链接和回调语义；异步资源及表单按身份变化条件重置，保留迟到请求隔离和 Demo 独立会话。
