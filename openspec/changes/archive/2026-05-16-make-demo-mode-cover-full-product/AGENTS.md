# make-demo-mode-cover-full-product/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
.openspec.yaml: OpenSpec change 元数据，标记 spec-driven 工作流
README.md: change 标题与短描述，说明 Demo 升级为完整产品演示、教程和调试入口
proposal.md: 变更动机与范围，锁定公开 Demo 模式、真实工作区空白态和不污染用户数据边界
design.md: 技术设计，记录登录页 Demo CTA、公开 /demo 路由、组件复用、页级 Demo 提醒、可选 Supabase 分享码读取、静态 AI/分享预览、真实路径保留与导航 fallback 决策
tasks.md: 执行清单，按 Demo 路由、统一数据、壳层导航、测试和文档同步拆分任务
specs/: delta 规格目录，定义 demo-mode 新能力及 auth/app-shell 公开 Demo 边界变更

法则: Demo 是产品演示层，不是用户数据种子；真实数据只来自用户自己的输入和 Supabase 归属边界。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
