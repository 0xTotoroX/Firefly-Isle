# separate-workspace-input-record-export/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
proposal.md: 说明重新划分 `/app` 输入台与 `/record/:id` 导出台职责的动因、范围与边界
design.md: 记录 Draft/Input 与 Archive/Export 职责分界、语音/文件入口位置、导出迁移与风险
tasks.md: 执行清单，按规格、输入区、导出迁移、文档同步与验证拆分
specs/: app-shell 与 export delta specs，约束输入提取台和正式档案导出台行为
.openspec.yaml: OpenSpec change 元数据，声明 schema 与创建日期

法则: `/app` 只做病历输入、结构化提取与草稿预览；`/record/:id` 才做正式病历档案与 PDF/PNG 导出。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
