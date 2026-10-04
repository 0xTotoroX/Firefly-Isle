# src/components/timeline/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
TimelineTable.tsx: 主表格组合与按病历 id 隔离的编辑状态；按 lineNumber 排序治疗阶段，继续导出原分区及 blur helper 接口，整页无包围式大外框。
timeline-sections.tsx: 基本信息、初发与治疗线字段映射；每阶段独立标题和局部边界，遗传/免疫信息保留阶段归属。
timeline-cell.tsx: 可编辑/只读字段、缺失提示和关键字段高亮；长文本换行、多行编辑、Escape 取消和下次编辑 guard 重置。
timeline-format.ts: 纯显示值/编辑值、指标单位和日期区间格式。
TimelineTable.test.tsx: 时间线静态合同测试，约束单次 blur 取消、治疗顺序、长文本完整显示、主题变量、去除装饰代码和患者类型标签。
TimelineTable.dom.test.tsx: 编辑真实交互回归，覆盖取消后再次提交、多行治疗文本、切换病历隔离与只读文本/缺失提示。
TreatmentGanttView.tsx: 治疗方案甘特图展示组件，消费 PatientRecord、locale 文案、demo-only 补充说明与 treatment-gantt 投影，窄屏展示纵向治疗卡片，桌面展示左右固定信息、中间独立拖动时间轴、BL/Ln 标记、PFS、间隔、字段级保存编辑值与条形生长动效
TreatmentGanttView.test.tsx: 治疗方案甘特图静态渲染测试，约束窄屏治疗卡片、桌面左侧方案/PFS/L 标记、中间可拖动时间轴、右侧补充资料、缺失日期与空态 DOM 输出
treatment-gantt.ts: 治疗方案甘特纯数据投影，负责初发 baseline BL、治疗线 Ln 标记、lineNumber 排序、共享时间段/PFS 计算、axis tick、gap、bar 百分比、开放当前线判定与可保存字段/日期范围 target
treatment-gantt.test.ts: 治疗方案甘特纯逻辑测试，约束 baseline BL+多线 Ln 标记排序、共享 PFS 计算、间隔虚线、开放当前线、缺失日期不画假 bar 与空记录

法则: 渲染规则跟着 PatientRecord 走，不在 UI 层发明第四种患者类型；甘特图只是 initialOnset 与 treatmentLines 的展示投影，不是新模型。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
