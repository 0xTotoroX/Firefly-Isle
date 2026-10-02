# src/components/record/
> L2 | 父级: /src/components/CLAUDE.md

成员清单
CLAUDE.md: 说明病例详情展示层内部拆分与 route 边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
types.ts: 病例详情展示类型边界，定义 ExportFormat、带字段保存 target 的 Metric/EvidenceCard、带日期范围 target 的 TimelineEntry 等 UI 数据形状，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
ClinicalAnalysisPanel.tsx: 平面 AI 辅助分析章节，保留生成入口、加载态、失败态、治疗线摘要、指标趋势摘要、复核关注点、就诊前问题与非诊断免责声明；生成按钮通过截图忽略标记排除导出，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
RecordSharePanel.tsx: 默认折叠的分享管理，保留创建、复制、查看、撤销及有效期；用用户可理解的文字解释一次性链接，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
LabTrendsTable.tsx: 平面实验室趋势章节，消费 PatientRecord.labResults 并渲染最新值、参考范围、持续增高提示与空态，不额外制造卡片层级，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
LabTrendsTable.test.tsx: 实验室趋势表回归测试，约束持续增高高亮、非诊断文本与空态渲染，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
demo-record.ts: 统一虚构 fixture 的默认病历兼容导出，供展示派生与测试使用。
record-copy.ts: 病例详情静态文案模块，提供无装饰性认证状态的 labels、含癌种/体格占位/多段检查证据的 summaryMetrics 与带字段保存 target 的 BL/Ln 标记/补充资料/rail 时间段/每线 PFS 归一逐线演示时间线组装，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-line-labels.ts: 治疗线中文线别命名工具，把 lineNumber 归一成一线/二线治疗或英文 Line N Therapy，供 demo 与真实记录派生共享，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-timeline-time.ts: 病例详情时间显示 facade，提供 rail 日期、含 ongoing 终点的时间段与 PFS 标签命名入口，真实日期解析和 PFS 口径委托 src/lib/timeline-duration，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-derived.ts: PatientRecord 展示派生层，把真实病历转换为含癌种、身高、体重、BMI、多段基因检测与免疫组化证据的概要指标，以及带字段保存/日期范围 target 的 BL/Ln 标记、补充资料、rail 时间段与每线 PFS 紧凑时间线条目，避免基础信息重复进入 timeline，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-dossier.tsx: 纵向临床档案，按概要、治疗时间线、完整指标表、AI 辅助分析和临床备注排序；导出标记区分正文块与操作区，返回工作区时携带当前 patient id，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
patient-record-list.tsx: 可注入真实或 Demo 摘要与链接的纯展示列表，渲染姓名、病种、更新时间、病历/指标/录入入口及分页、空态和失败重试。

clinical-record-nav.tsx: 按 patientId 与 locale 连接病历、指标、症状、随访的共享导航，包含当前页语义，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

delete-record-button.tsx: Radix 删除确认，提供焦点管理、请求锁、失败重试和窄屏布局，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

record-load-feedback.tsx: 共享加载和读取失败重试提示，避免把请求失败呈现为空记录，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: route 只给数据和动作，record 展示层只渲染 dossier/分析/分享表现；Supabase row 映射留在 lib/patient-record-storage.ts，LLM 与分享调用留在 route/lib 边界。
