/**
 * [INPUT]: 无直接运行时代码，描述 medical-document-ocr 模块的职责边界与成员。
 * [OUTPUT]: 对外提供 medical-document-ocr 目录地图，供函数实现与后续扩展同步使用。
 * [POS]: supabase/functions 的 L2 文档，约束医学文档 OCR 代理函数的单点边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
# supabase/functions/medical-document-ocr/
> L2 | 父级: /supabase/functions/CLAUDE.md

成员清单
CLAUDE.md: 说明 medical-document-ocr 目录的职责边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
index.ts: Edge Function Deno 启动壳，读取运行时 env 并挂载统一 handler，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
handler.ts: 可测试核心，负责 JWT 校验、图片/PDF 输入校验、DeepSeek/Gemini OCR 转发、原子额度消费、超时与具名错误响应，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
handler.test.ts: 图片/PDF Gemini 请求、header 密钥、额度拒绝与故障停止、错误映射、缺 key 与 secret 不泄露回归测试，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: OCR 只提取原始文本；结构化 PatientRecord 仍交给现有提取链路。
