# supabase/migrations/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
20261002161000_data_api_grants.sql: 显式 Data API 表/列/RPC 授权；未登录仅可读取分享 RPC，账本保持客户端只读，不依赖自动暴露配置。
20261002161100_record_create_idempotency.sql: 草稿 UUID 原子创建/重试，重复请求返回已有记录；兼容旧两参数 RPC，保留已存在 ID 的 owner 更新约束。
20261002151647_donation_payment_integrity.sql: 仅 service_role 的 record_donation_payment 原子合并捐赠状态，固定付款事实并保留注销后的解除关联。
20261002105552_record_integrity_and_sharing.sql: 病历/报告事务、稳定子记录身份、发起账号核验、分享 RPC 和撤销权限收紧。
001_init.sql: 建立 patients、treatment_lines、RLS 与 updated_at trigger 的首个 MVP 迁移
002_lab_results.sql: 建立 lab_results、趋势索引、级联删除与基于 patients.user_id 的 RLS policy
003_llm_provider_settings.sql: 建立 llm_provider_settings、加密 key 字段、provider/model 约束、updated_at trigger 与 owner RLS policy
004_patient_clinical_notes.sql: 为 patients 增加 clinical_notes 文本列，承载临床备注与原“其他信息”内容
005_lab_report_batches.sql: 建立 lab_report_batches 批次事实表，并为 lab_results 增加 batch_id、is_derived、derivation_method 以支持网页端实验室报告摄入
006_record_shares.sql: 建立 record_shares、授权码 hash 校验 RPC、active share 只读 RLS 与 owner 管理 policy
llm-provider-settings.test.ts: 迁移合同测试，约束 llm_provider_settings 不含明文 key 列、preset/custom model 约束与四类 owner RLS policy

20260912051552_clinical_workflow_integrity.sql: 追加症状/随访 owner 默认值、患者/治疗线归属 RLS、写入校验、最新指标索引与 security invoker RPC

20261002111617_atomic_usage_quota.sql: 追加双窗口原子额度消费、有效套餐选择、plans 只读策略与旧记账 RPC 权限撤销。

007_profiles.sql: supabase/migrations 的账户档案迁移，为 SaaS 账户设置提供 display_name / locale 偏好的数据库事实。
008_delete_own_account.sql: 带 auth.uid 校验的 delete_own_account 自服务注销 RPC；账户关联表级联，捐赠去关联保留由后续迁移定义。
009_usage_ledger.sql: 建立 usage_events 和早期 record_usage；后续 atomic_usage_quota 迁移改用 consume_usage 并撤销客户端 record_usage 权限。
010_billing.sql: plans/subscriptions 计费与权益数据基座；当前 Checkout/webhook 使用后续捐赠合同，不宣称订阅支付已上线。
011_donations.sql: supabase/migrations 的公益捐赠迁移。产品功能全免费，Stripe Checkout 只收一次性捐赠。
012_side_effects.sql: supabase/migrations 的症状日志迁移，让患者能把治疗过程中的不适反应用结构化字段留存，作为病历的辅助证据。
013_follow_up.sql: supabase/migrations 的随访模块迁移，承载复查计划倒计时、随访记录与显式随访状态三个能力的数据事实。
billing.test.ts: supabase/migrations 的计费 contract 测试，约束每用户唯一订阅、状态枚举、owner 只读 RLS 与种子价格档存在。
delete-own-account.test.ts: supabase/migrations 的隐私合规 contract 测试，约束自删账户 RPC 必须校验 auth.uid、级联依赖外键 cascade，且只授权 authenticated。
donations.test.ts: supabase/migrations 的捐赠 contract 测试，约束正金额、状态枚举、owner 只读与 donation plan 种子行。
follow-up.test.ts: supabase/migrations 的随访 contract 测试，约束随访记录 owner 四权 RLS、文本长度护栏、患者状态枚举与列的可重复应用。
profiles.test.ts: supabase/migrations 的 schema contract 测试，防止 profiles 越权 policy、locale 枚举或自动建档触发器漂移。
side-effects.test.ts: supabase/migrations 的症状日志 contract 测试，约束严重程度枚举、日期顺序、owner 四权 RLS 与级联归因。
usage-ledger.test.ts: supabase/migrations 的配额 contract 测试，约束 kind 枚举、owner 只读 RLS 与 record_usage RPC 的鉴权边界。

法则: 每个迁移都是一次可审计的数据库事实，不把 schema 变化散落到别处。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
