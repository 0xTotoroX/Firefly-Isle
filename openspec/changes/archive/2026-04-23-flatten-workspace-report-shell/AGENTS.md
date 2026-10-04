# flatten-workspace-report-shell/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
proposal.md: 说明工作区报告预览去壳的用户动因、影响范围与不触碰提取/导出状态机的边界
design.md: 记录 route 层去标题壳、feature 层去外框、TimelineTable 直接成为主表面的设计决策
tasks.md: 执行清单，只反映红灯测试、实现、文档同步与验证的真实状态
specs/: app-shell delta spec，定义 `/app` 报告区不再额外渲染总标题壳

.openspec.yaml: OpenSpec 变更元数据，声明 schema 与创建日期。

法则: 工作区报告区直接进入时间线主表面，不再用总标题壳重复包装。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
