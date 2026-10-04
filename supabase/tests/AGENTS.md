# supabase/tests/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
account-isolation.sql: 逐表 owner/跨账号/未登录与匿名账号隔离、profile 自动建档和注销去向；最小 Auth 替身不代表真实认证验收。
clinical-workflows.sql: 患者/治疗线归属、症状随访 CRUD、日期约束、最新指标与随访 RPC 的真实数据库行为检查。
data-api-permissions.sql: 在测试脚本扩大授权前核验迁移实际 GRANT 与可调用写入/分享/配额/注销，区分对象授权和 RLS。
donation-payments.sql: 捐赠状态合并、重放、不可变付款事实、服务端 RPC 权限和注销后的去关联保留。
record-create-idempotency.sql: 同请求创建重试、子记录身份保留、后续编辑、旧调用兼容、跨账号拒绝及事务回滚。
record-integrity.sql: 病历/化验原子写入与所有权、分享只读 RPC 的能力边界和撤销；使用合成数据。
usage-quota.sql: 免费/有效/过期权益、短时及滚动月额度、拒绝与计数规则；并发由调用脚本启动独立连接验证。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
