# supabase/migrations/
> L2 | 父级: /supabase/CLAUDE.md

成员清单
20261002105552_record_integrity_and_sharing.sql: 病历/报告事务、稳定子记录身份、发起账号核验、分享 RPC 和撤销权限收紧。
CLAUDE.md: 说明迁移目录职责与命名规则，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
001_init.sql: 建立 patients、treatment_lines、RLS 与 updated_at trigger 的首个 MVP 迁移，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
002_lab_results.sql: 建立 lab_results、趋势索引、级联删除与基于 patients.user_id 的 RLS policy，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
003_llm_provider_settings.sql: 建立 llm_provider_settings、加密 key 字段、provider/model 约束、updated_at trigger 与 owner RLS policy，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
004_patient_clinical_notes.sql: 为 patients 增加 clinical_notes 文本列，承载临床备注与原“其他信息”内容，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
005_lab_report_batches.sql: 建立 lab_report_batches 批次事实表，并为 lab_results 增加 batch_id、is_derived、derivation_method 以支持网页端实验室报告摄入，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
006_record_shares.sql: 建立 record_shares、授权码 hash 校验 RPC、active share 只读 RLS 与 owner 管理 policy，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
llm-provider-settings.test.ts: 迁移合同测试，约束 llm_provider_settings 不含明文 key 列、preset/custom model 约束与四类 owner RLS policy，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

20260912051552_clinical_workflow_integrity.sql: 追加症状/随访 owner 默认值、患者/治疗线归属 RLS、写入校验、最新指标索引与 security invoker RPC，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

20261002111617_atomic_usage_quota.sql: 追加双窗口原子额度消费、有效套餐选择、plans 只读策略与旧记账 RPC 权限撤销。

法则: 每个迁移都是一次可审计的数据库事实，不把 schema 变化散落到别处。
