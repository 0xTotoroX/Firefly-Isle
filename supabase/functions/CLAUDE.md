/**
 * [INPUT]: 无直接运行时代码，描述 Supabase Edge Functions 目录的职责边界与成员。
 * [OUTPUT]: 对外提供 functions 目录地图，供后续 llm-proxy 等函数模块同步使用。
 * [POS]: supabase 的函数层 L2 文档，连接基础设施目录与具体 Edge Function 子模块。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
# supabase/functions/
> L2 | 父级: /supabase/CLAUDE.md

成员清单
_shared/usage-limits.ts: 共享 consume_usage RPC 客户端；只接受明确的获准或拒绝结果，故障停止上游调用。
_shared/usage-limits.test.ts: RPC 参数、结果校验及故障关闭测试。
CLAUDE.md: 说明 Edge Functions 目录的边界与同步规则，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
llm-proxy/: 多 provider LLM 代理函数模块，负责 JWT 校验、用户 provider 设置加密持久化、系统 DeepSeek fallback、模型转发与统一错误响应，并由 tsconfig.supabase-functions.json 独立 type-check，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
medical-document-ocr/: 医学文档 OCR 代理函数模块，负责 JWT 校验、图片/PDF 输入校验、Gemini OCR header 鉴权转发与统一错误响应，并由 tsconfig.supabase-functions.json 独立 type-check，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: 函数只做安全边界与协议转换，不在这里堆业务状态机。
