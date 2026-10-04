# src/components/timeline/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
TimelineTable.tsx: 按 PatientRecord 结构组合基本信息、初发区块与治疗线区块的主表格组件，消费 V3 timeline token、locale 文案真相源，并负责关键缺失字段橙色高亮、行内编辑入口、blur 取消提交 helper 与患者类型标签隐藏边界
TimelineTable.test.tsx: 主时间线表格合同测试，约束 Escape 取消后的 blur 只跳过一次提交、CSS 变量主题 helper 不再保留重复 dark/light class 分支，以及患者类型标签不外露
TreatmentGanttView.tsx: 治疗方案甘特图展示组件，消费 PatientRecord、locale 文案、demo-only 补充说明与 treatment-gantt 投影，窄屏展示纵向治疗卡片，桌面展示左右固定信息、中间独立拖动时间轴、BL/Ln 标记、PFS、间隔、字段级保存编辑值与条形生长动效
TreatmentGanttView.test.tsx: 治疗方案甘特图静态渲染测试，约束窄屏治疗卡片、桌面左侧方案/PFS/L 标记、中间可拖动时间轴、右侧补充资料、缺失日期与空态 DOM 输出
treatment-gantt.ts: 治疗方案甘特纯数据投影，负责初发 baseline BL、治疗线 Ln 标记、lineNumber 排序、共享时间段/PFS 计算、axis tick、gap、bar 百分比、开放当前线判定与可保存字段/日期范围 target
treatment-gantt.test.ts: 治疗方案甘特纯逻辑测试，约束 baseline BL+多线 Ln 标记排序、共享 PFS 计算、间隔虚线、开放当前线、缺失日期不画假 bar 与空记录

法则: 渲染规则跟着 PatientRecord 走，不在 UI 层发明第四种患者类型；甘特图只是 initialOnset 与 treatmentLines 的展示投影，不是新模型。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
