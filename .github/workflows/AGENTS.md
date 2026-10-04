# .github/workflows/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
ci.yml: 当前主线 CI 工作流，覆盖 main push、main PR opened/edited/synchronize/reopened、Conventional Commits 标题检查、lint、SPA/Node/Cloudflare/Supabase type-check、隔离 PostgreSQL 事务/RLS/配额并发验收、coverage test、build、Supabase CLI 版本核验与 Wrangler Pages Functions 本地编译，不负责部署
cd.yml: 当前主线 CD 工作流，仅在 `v*` tag 或手动触发时构建并发布到 Cloudflare Pages，并校验待部署 commit 来自 main

supabase-deploy.yml: 手动 Supabase 发布入口；依赖 secrets，缺配置跳过，可选择跳过迁移；仅文档检查不触发发布。

法则: 工作流名和步骤名直白可查，失败点必须能一眼定位。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
