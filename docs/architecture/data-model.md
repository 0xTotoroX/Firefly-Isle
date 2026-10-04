# 数据模型与权限

当前事实源是 `supabase/migrations/*.sql`。以下描述应用表及其关系；它不意味着生产环境已经执行全部迁移。`npm run test:database` 在无网络临时 PostgreSQL 中从零执行全部迁移，再验证权限与事务。

## 关系和数据归属

一个账户可拥有多份 `patients` 病历。病历保存基本信息、可选初始治疗和临床备注；`treatment_lines` 保存有稳定 ID 的治疗阶段。化验结果独立于治疗线：`lab_report_batches` 保存来源和审核事实，`lab_results` 保存图表使用的指标。副作用可关联同一患者的治疗线；随访按患者记录。阶段内检测资料仍属于对应初始治疗或治疗线，不提取成会丢失时间关系的公共摘要。

`auth.users` 是身份源，匿名登录同样有独立用户 ID 和 `authenticated` 角色。未登录的 `anon` 数据库角色没有病历表访问权。界面按三种患者形态展示同一模型，不建立三套表。

## 逐表 RLS

下表的“本人”指 `auth.uid()`，不是前端传入后就可信的用户 ID。所有下列应用表均启用 RLS；service-role 凭据只用于服务端，不进入浏览器。

| 表 | 主键和归属 | 浏览器权限 | 注销或父记录删除 |
| --- | --- | --- | --- |
| patients | id；user_id → auth.users | 本人增删改查；不能变更为他人归属 | 注销级联删除 |
| treatment_lines | id；patient_id → patients | 仅本人患者的增删改查 | 患者删除时级联；正常保存保持已有 ID |
| lab_report_batches | id；patient_id → patients | 仅本人患者的增删改查 | 患者删除时级联 |
| lab_results | id；patient_id → patients；batch_id 可空 | 仅本人患者的增删改查；写批次 RPC 同时校验归属 | 患者删除级联；批次单独删除解除 batch_id |
| side_effects | id；user_id、patient_id；line_id 可空 | 本人且患者属于本人；治疗线必须属于同一患者 | 注销/患者删除级联；治疗线删除解除 line_id |
| follow_up_visits | id；user_id、patient_id | 本人且患者属于本人的增删改查 | 注销/患者删除级联 |
| profiles | user_id → auth.users | 本人读取、创建与更新；无直接删除策略 | 自动建档；注销级联 |
| llm_provider_settings | id；user_id 唯一 | 本人增删改查；产品经 Edge Function 加解密 | 注销级联；导出排除 ciphertext/IV |
| record_shares | id；owner_user_id、patient_id | 本人读取、为自己的病历创建；更新只授予 revoked_at 列，不能改写目标，无直接删除策略 | 注销/患者删除级联；日常以 revoked_at 撤销 |
| usage_events | id；user_id | 本人只读；用量经 `consume_usage` 校验当前身份和额度后记录 | 注销级联 |
| subscriptions | id；user_id 唯一；plan_id → plans | 本人只读；权益写入限服务端 | 注销级联 |
| donations | id；user_id 可空；Checkout Session 唯一 | 本人只读；经签名验证的服务端事件记账 | 注销置空 user_id，保留不再关联账户的收据记录 |
| plans | id；无用户私有数据 | authenticated 可读；客户端不能增删改 | 不随账户删除 |

用户自己的 BYOK 行可以通过 RLS 读取到密文；产品 API 与导出进一步采用字段白名单，不能把“已加密”当作允许日志输出密文的理由。Plans/subscriptions 是额度基座；已有价格种子不表示产品已经销售订阅。

## 受控操作

- `persist_patient_record` 保持治疗线身份，整份保存事务成功或回滚。初次保存可带草稿生成的 `create_request_id`：同一请求重试返回已保存记录，不重复创建或覆盖后续编辑；显式 `record.id` 仍按已有记录更新。旧两参数调用兼容。移除仍被症状引用的治疗线必须按现有合同处理，不使用先删后建刷新全部 ID。
- 化验批次保存 RPC 同时写审核事实与结果；重复替换使用已确认的批次，不跨患者覆盖。
- 公开分享通过授权码 hash 的受控只读 RPC 返回白名单字段；原来允许凭活跃分享直接读取患者表的策略已移除。输出不含 owner ID、hash 或源文件字段，但患者姓名仍属于经授权分享的病历内容，不能称为匿名化。
- `consume_usage` 将额度判断与预占放在数据库中处理并发；只允许 authenticated 调用，并从 `auth.uid()` 取本人身份，不接受任意用户 ID 或额度。Edge Function 使用调用者的 token 执行它；直接调用也只能在限额内消耗自己的次数。短时间与滚动 30 天窗口分别控制。
- `record_donation_payment` 只供 service-role 调用。Webhook 验签后按 Checkout Session 原子合并付款事实，未支付的完成事件保持 pending，重复/并发事件不增加收据，晚到事件不降级 paid/refunded，注销后的空 user_id 不被重放恢复。此函数不发起支付，也不授予订阅权益。
- `delete_own_account` 根据当前身份删除自身账户；不接受目标用户 ID。数据库级联与捐赠去关联由真实 SQL 行为检查覆盖；邮件、会话和 Auth 服务行为另做端到端验收。

## 验证边界

`supabase/tests/account-isolation.sql` 覆盖 12 张用户表的本人/他人/匿名账号/未登录隔离、所有权变更拒绝、只读表写入拒绝、profiles 自动建档、注销后的数据去向和分享失效。临床、分享、保存、化验与配额测试另覆盖事务和并发。测试使用最小 `auth.users` / `auth.uid()` 替身，不代替真实 GoTrue 注册、邮件投递或生产迁移验收。

显式权限检查先于 RLS 压力测试的临时扩大授权执行，包含实际最小 GRANT、分享仅 `revoked_at` 列可更新及 RPC 角色边界。2026-10-02 已在完整本地 Supabase（Auth、PostgREST、PostgreSQL）应用全部 19 份迁移，验证两邮箱和匿名身份、13 张表读取、病历/症状/随访/化验读写、创建并发与重试、公开分享和撤销、Dashboard RPC。独立升级检查确认旧 17 份迁移已有数据升级后子记录 ID 不变，旧两参数 RPC 仍可用。邮箱确认与密码邮件流程单独记录，不由这些检查推断。

操作入口见 [`clinical-workflow-release.md`](../operations/clinical-workflow-release.md)、[`record-integrity-release.md`](../operations/record-integrity-release.md) 和 [`supabase-self-hosted.md`](../operations/supabase-self-hosted.md)。
