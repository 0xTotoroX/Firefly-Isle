# integrate-deepseek-api/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
proposal.md: 说明为什么将 LLM 代理从 Gemini-only 扩展到 DeepSeek 服务端通道
design.md: 记录 provider adapter 表、DeepSeek OpenAI 格式请求、JSON 输出、错误映射、配置与回滚策略
tasks.md: 执行清单，按上下文确认、测试先行、Edge Function adapter、前端协议、文档同步和验证拆分
specs/: llm-adapter delta spec，约束 provider 切换、DeepSeek JSON 输出、安全代理与错误协议
.openspec.yaml: OpenSpec schema 元数据，声明本 change 使用 spec-driven workflow

法则: 前端只知道 chat；模型密钥只在服务端；provider 差异必须被 adapter 吞掉。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
