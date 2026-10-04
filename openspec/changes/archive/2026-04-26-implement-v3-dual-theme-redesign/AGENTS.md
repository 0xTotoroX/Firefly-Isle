# implement-v3-dual-theme-redesign/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
proposal.md: 说明 V3 双主题视觉重构的用户动因、影响范围与不碰业务逻辑的边界
design.md: 记录 V3 视觉真源、同骨架不同材料原则、实现顺序、风险与截图 mismatch 验收要求
tasks.md: 执行清单，按 token/CSS、system shell、页面 composition、文档同步与验证拆分
verification.md: 记录 V3 dark/light 桌面与移动浏览器验收、截图证据目录、运行图与设计图 mismatch 清单
specs/: theme-system 与 app-shell delta specs，约束 V3 视觉系统和页面壳层行为
.openspec.yaml: OpenSpec change 元数据，声明 schema 与创建日期

法则: 此 change 只允许实现 V3 视觉系统，不改变路由、认证、提取、PatientRecord、持久化或 PDF/PNG 导出行为。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
