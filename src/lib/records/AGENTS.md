# src/lib/records/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

病历领域的前端读写与纯逻辑；数据库约束、RLS 和事务实现仍在 `supabase/`。

成员清单
patient-record-storage.ts: 病历/治疗线/化验映射与摘要分页；保存使用核对当前账号的事务 RPC，草稿重试复用 createRequestId。
record-editing.ts: 自然语言编辑转为字段 patch，校验目标并归一化合并。
record-edit-queue.ts: 按病历和账号串行保存字段 patch，下一次编辑基于最后成功保存的记录。
record-sharing.ts: 授权码 hash、所有者分享管理与脱敏只读 RPC。
patient-metrics.ts: 身高、体重和 BMI 的纯计算与格式化。
timeline-duration.ts: 病程日期、时间段、PFS 和进行中状态的统一口径。
*.test.ts: 与上述模块同名的回归测试，覆盖身份、写入/重试、编辑顺序、分享和计算规则。

边界: 页面消费这些客户端接口；不能在这里绕过服务端权限或恢复旧的非事务写入。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md。
