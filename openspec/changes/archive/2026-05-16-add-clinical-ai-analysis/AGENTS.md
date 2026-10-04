# add-clinical-ai-analysis/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
.openspec.yaml: OpenSpec change 元数据，标记 spec-driven 工作流
README.md: change 标题与短描述，说明本变更添加非诊断 AI 临床辅助分析
proposal.md: 变更动机与范围，锁定 PatientRecord + lab_results 辅助分析而非诊断建议
design.md: 技术设计，记录 prompt/schema、llm-proxy 调用、缓存/刷新、降级和 UI 入口边界
tasks.md: 执行清单，按 OpenSpec、纯逻辑、UI、测试和文档同步拆分任务
specs/: delta 规格目录，定义 clinical-ai-analysis 新能力

法则: 分析只解释当前记录和指标趋势；所有输出必须保持非诊断，不给治疗指令。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
