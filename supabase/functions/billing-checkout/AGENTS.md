# supabase/functions/billing-checkout/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
handler.ts: createBillingCheckoutHandler 校验 Supabase 用户，按金额创建一次性 Stripe 捐赠 Checkout；缺少密钥或成功/取消地址返回 BILLING_DISABLED。
handler.test.ts: 合成请求与注入 fetch 的开关、用户鉴权、商品展示名、一次性支付金额及 metadata 回归，不创建真实支付。
index.ts: Deno serve 部署入口，仅装配运行时环境和可测试 handler。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
