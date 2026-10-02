# supabase/
> L2 | 父级: /CLAUDE.md

成员清单
CLAUDE.md: 说明 Supabase 基础设施目录与迁移边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
functions/: Edge Functions 模块目录，承载 llm-proxy、medical-document-ocr 等服务端安全边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
migrations/: PostgreSQL schema、RLS 与 trigger 迁移脚本，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

tests/clinical-workflows.sql: 隔离 PostgreSQL 的双用户 CRUD、越权拒绝、日期和最新状态行为测试，事务结束回滚，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

tests/usage-quota.sql: 免费/有效/到期套餐、短时与30天额度、计数边界和权限回归；并发验证由数据库检查脚本启动独立连接。

法则: 先把数据库边界写死，再让应用层接入，不在前端里偷渡权限逻辑。
