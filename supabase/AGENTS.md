# supabase/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
config.toml: 仅为 stripe-webhook 关闭平台 JWT 前置检查，由 handler 校验 Stripe 原文签名；其他函数保持默认 JWT 验证。
functions/: Edge Functions 模块目录，承载 llm-proxy、medical-document-ocr 等服务端安全边界
migrations/: PostgreSQL schema、RLS 与 trigger 迁移脚本

tests/data-api-permissions.sql: 在测试脚本扩大授权前核验迁移的真实表/列/RPC 权限，实际运行 owner 写入、分享、Dashboard、配额与注销。

tests/record-create-idempotency.sql: 创建重试、后续编辑保留、新草稿区分、旧调用兼容、跨账号拒绝与事务回滚；脚本另用独立连接验证并发创建。

tests/account-isolation.sql: 全部用户表的 owner/跨账号/未登录 RLS、匿名账号隔离、profile 自动建档和注销级联；捐赠记录保留但解除账号关联。由数据库检查脚本在空库依次执行全部 SQL 迁移后运行；auth.users/auth.uid 为最小测试替身，不覆盖真实注册、邮件或 Supabase 内部会话清理。

tests/clinical-workflows.sql: 隔离 PostgreSQL 的双用户 CRUD、越权拒绝、日期和最新状态行为测试，事务结束回滚

tests/usage-quota.sql: 免费/有效/到期套餐、短时与30天额度、计数边界和权限回归；并发验证由数据库检查脚本启动独立连接。

tests/donation-payments.sql: 服务端专用捐赠 RPC 的状态合并、重复事件、付款事实冲突和注销重放；数据库检查脚本补充两个连接同时收到付款成功与迟到完成的竞争。

法则: 先把数据库边界写死，再让应用层接入，不在前端里偷渡权限逻辑。
tests/: 隔离 PostgreSQL 中执行的七份合成数据行为检查；具体成员及最小 Auth 替身边界见 tests/AGENTS.md。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
