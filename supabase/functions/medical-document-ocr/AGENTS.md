# supabase/functions/medical-document-ocr/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
index.ts: Edge Function Deno 启动壳，读取运行时 env 并挂载统一 handler
handler.ts: 可测试核心，负责 JWT 校验、图片/PDF 输入校验、DeepSeek/Gemini OCR 转发、原子额度消费、超时与具名错误响应
handler.test.ts: 图片/PDF Gemini 请求、header 密钥、额度拒绝与故障停止、错误映射、缺 key 与 secret 不泄露回归测试

法则: OCR 只提取原始文本；结构化 PatientRecord 仍交给现有提取链路。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
