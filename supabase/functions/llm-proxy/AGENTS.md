# supabase/functions/llm-proxy/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
rate-limits.ts: provider 模型白名单，额度消费委托共享 consume_usage 客户端。
index.ts: Edge Function Deno 启动壳，读取运行时 env 并挂载统一 handler
handler.ts: 可测试核心，负责 JWT 校验、PostgREST 设置读写、API key 加密/解密、用户 provider/model 设置优先路由、系统 provider 测试绕过、原子额度消费、超时与具名错误响应
handler.test.ts: provider 选择、DeepSeek fallback、用户 preset/custom provider/model 设置、系统 DeepSeek 绕过、Gemini header 密钥、JSON 输出与错误映射回归测试
provider-adapters.ts: provider adapter registry，集中 Gemini、Claude、OpenAI-style 请求构造、响应提取、preset 默认模型与错误映射

法则: 先验证调用者，再读用户设置，最后访问外部模型；所有失败都收敛成可识别协议。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
