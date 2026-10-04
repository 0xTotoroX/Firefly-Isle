# restore-minimal-timeline-table-view/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
.openspec.yaml: OpenSpec change 元数据，标记 spec-driven 工作流
README.md: change 标题与短描述，说明本变更恢复一页极简 TimelineTable 主链路
proposal.md: 变更动机与范围，锁定真实 record 的极简表格视图回归
design.md: 技术设计，记录三视图切换、复用 TimelineTable、导出不回退和编辑边界
tasks.md: 执行清单，按 OpenSpec、路由接入、测试和文档同步拆分任务
specs/: delta 规格目录，定义 timeline-table 与 export 变更

法则: TimelineTable 是现有 PatientRecord 的投影；不得复制治疗线数据模型或编辑逻辑。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
