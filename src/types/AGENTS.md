# src/types/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
patient.ts: PatientRecord、姓名/临床备注、TreatmentLine、InitialOnset、LabReportBatch、带批次/派生元数据的 LabResult、PatientFieldTarget、PatientRangeTarget 与患者 archetype 判定工具
patient.test.ts: PatientRecord archetype 判定的最小回归测试，供 CI 校验核心领域分支
threejs-components.d.ts: third-party liquid1 WebGL 背景模块声明，给本地 threejs-components 动态导入提供最小类型契约

法则: 类型先讲清现实结构，再谈工具函数，不在类型文件里混入 UI 状态。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
