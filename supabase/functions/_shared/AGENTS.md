# supabase/functions/_shared/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
logger.ts: createFunctionLogger 与日志类型；为上游错误、超时及限流提供单行 JSON 日志，调用者负责排除密钥和敏感正文。
usage-limits.ts: consumeUsage 调用 consume_usage 原子 RPC，校验获准/拒绝结果，故障时停止模型或 OCR 上游请求。
usage-limits.test.ts: 注入 fetch 的协议回归，覆盖 RPC 参数、额度拒绝、非法响应和网络故障；真实配额并发由数据库检查验证。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
