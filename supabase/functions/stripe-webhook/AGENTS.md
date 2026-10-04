# supabase/functions/stripe-webhook/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
handler.ts: createStripeWebhookHandler/verifyStripeSignature 校验原始正文签名和一次性付款事实，再通过 record_donation_payment 原子合并捐赠状态。
handler.test.ts: 合成签名、时间容差、未配置关闭、付款事实及单 RPC 协议回归；重放与并发另由 SQL 行为检查验证。
index.ts: Deno serve 入口，装配环境并交给 handler 验证 Stripe 一次性捐赠事件。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
