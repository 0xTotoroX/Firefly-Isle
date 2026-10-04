# specs/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
record-sharing/spec.md: 新增病历分享规格，定义创建、查看、撤销、过期、错误授权码和只读访问
supabase-schema/spec.md: 修改 Supabase schema，新增 record_shares 表与 RLS/授权查询边界

法则: 授权码只证明访问单份记录；永远不能变成用户身份或全库权限。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
