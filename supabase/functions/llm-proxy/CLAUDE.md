/**
 * [INPUT]: 无直接运行时代码，描述 llm-proxy 模块的职责边界与成员。
 * [OUTPUT]: 对外提供 llm-proxy 目录地图，供函数实现与后续扩展同步使用。
 * [POS]: supabase/functions 的 L2 文档，约束多 provider LLM 代理函数的单点边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
# supabase/functions/llm-proxy/
> L2 | 父级: /supabase/functions/CLAUDE.md

成员清单
rate-limits.ts: provider 模型白名单，额度消费委托共享 consume_usage 客户端。
CLAUDE.md: 说明 llm-proxy 目录的职责边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
index.ts: Edge Function Deno 启动壳，读取运行时 env 并挂载统一 handler，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
handler.ts: 可测试核心，负责 JWT 校验、PostgREST 设置读写、API key 加密/解密、用户 provider/model 设置优先路由、系统 provider 测试绕过、原子额度消费、超时与具名错误响应，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
handler.test.ts: provider 选择、DeepSeek fallback、用户 preset/custom provider/model 设置、系统 DeepSeek 绕过、Gemini header 密钥、JSON 输出与错误映射回归测试，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
provider-adapters.ts: provider adapter registry，集中 Gemini、Claude、OpenAI-style 请求构造、响应提取、preset 默认模型与错误映射，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: 先验证调用者，再读用户设置，最后访问外部模型；所有失败都收敛成可识别协议。
