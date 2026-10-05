# supabase/functions/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
stripe-webhook/: 原文验签后将一次性 Checkout 的 pending/paid/failed 事实提交 record_donation_payment；需先应用 20261002151647_donation_payment_integrity.sql，服务端独占记账 RPC。
_shared/usage-limits.ts: 共享 consume_usage RPC 客户端；只接受明确的获准或拒绝结果，故障停止上游调用。
_shared/usage-limits.test.ts: RPC 参数、结果校验及故障关闭测试。
llm-proxy/: 多 provider LLM 代理函数模块，负责 JWT 校验、用户 provider 设置加密持久化、系统 DeepSeek fallback、模型转发与统一错误响应，并由 tsconfig.supabase-functions.json 独立 type-check
medical-document-ocr/: JWT 验证、文件输入和额度检查；仅 deepseek-flash 图片及 PDF 页面路径，统一脱敏失败响应。

billing-checkout/: 登录用户的一次性 Stripe 捐赠 Checkout，可测试 handler 与 Deno 入口；缺必要配置时关闭，详见同目录地图。
_shared/: consume_usage 协议与单行 JSON 日志的共享服务模块，详见同目录地图。

法则: 函数只做安全边界与协议转换，不在这里堆业务状态机。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
