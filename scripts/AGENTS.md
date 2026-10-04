# scripts/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
check-clinical-workflows.sh: npm run test:database 的唯一入口；在无网络临时 PostgreSQL 容器中执行全部迁移、七份 SQL 行为检查及独立连接并发检查，只使用合成数据。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
