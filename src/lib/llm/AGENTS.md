# src/lib/llm/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
types.ts: Message、ChatProvider、ChatOptions、responseFormat 与具名错误类型定义，覆盖 Gemini/Claude/OpenAI/GLM/DeepSeek/Kimi/custom provider id
index.ts: 统一导出 chat(messages, options) 封装，负责 JWT 透传、provider/model/responseFormat 请求协议与错误映射，普通 chat 请求不携带用户 API key
index.test.ts: chat 请求协议回归测试，约束 provider、model 与 responseFormat 透传到 Edge Function 且不携带密钥
provider-settings.ts: LLM provider 设置客户端，负责调用 llm-proxy/settings 读取、保存、重置 provider/model 设置，复用 llm-proxy chat 绕过用户设置测试系统 DeepSeek，并过滤任何明文 key 回读
provider-settings.test.ts: provider 设置客户端协议测试，约束 preset 携带 model 且不携带 URL、custom 保存、DELETE 重置、系统 DeepSeek 绕过测试与明文 key redaction

法则: 调用方只知道 chat 与 settings 两个边界，不直接触碰 provider SDK 或明文密钥。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
