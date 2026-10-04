# refine-login-intro-drawer/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
proposal.md: 说明 /login 从并排双卡片入口升级为“全屏双主题海岸介绍页 + CTA 统一登录弹层”的 change 边界
design.md: 记录全屏双主题扁平海岸背景、无节点默认背景、参考图式灯塔路径登录卡、统一弹层、动画遮罩与视觉融合的设计决策
tasks.md: 执行清单，记录 proposal、设计、实现、验证的完成状态，并随实现与验证同步勾选
specs/: app-shell 与 theme-system 的 delta specs，定义 /login 入口结构和视觉合同变化

.openspec.yaml: OpenSpec 变更元数据，声明 schema 与创建日期。

法则: 登录页先是一张可理解的主题海岸，再是可复用的身份入口；弹层是状态，不是第二个页面。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
