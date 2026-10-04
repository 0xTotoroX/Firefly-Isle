# src/lib/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

前端的业务逻辑、客户端和共享状态。服务端实现位于 `supabase/` 与 `functions/`。

业务目录
records/: 病历读写、字段编辑队列、分享、体格指标与病程时间；见目录 AGENTS.md。
labs/: 化验字典、OCR 复核、趋势计算与批次保存；见目录 AGENTS.md。
workspace/: 工作台状态、提取/OCR/编辑动作与页面控制器；见目录 AGENTS.md。
llm/: 模型请求适配、provider 设置客户端与协议类型。
theme/: surface、文字、边框和动效 token。

账号与服务边界
supabase.ts: 客户端初始化、PKCE 回调和环境变量边界。
auth.tsx: 认证初始化、会话广播与退出；Demo 可通过 useOptionalAuth 读取空身份。
supabase-session-migration.ts: 自建目标的旧会话导入与迁移标记，保留源凭据。
password-recovery.ts: 用独立内存 AuthClient 将改密绑定到回调身份。
profile-settings.ts: 档案读写与注销，仅缺少可选 profiles 表时允许读取降级。
account-data-export.ts: 按当前身份分页导出账号数据，排除密钥和分享 hash。
side-effect-storage.ts: 当前用户的症状 CRUD、日期和写入结果校验。
follow-up-storage.ts: 随访 CRUD、日期顺序与患者关联校验。
dashboard-data.ts: 计数与最新指标/随访聚合，保留各分区错误。

提取与记录输出
extraction.ts: 结构化提取、确定性补全、追问合并、模型身份清洗与失败恢复。
extractionPrompt.ts: 紧凑的 PatientRecord 输出字段合同。
medical-document-ocr.ts: 图片/PDF 校验、OCR 请求和本地化错误映射。
clinical-analysis.ts: 非诊断辅助分析 prompt、响应校验与调用入口。
export-record.ts: 隔离浅色正文副本，按内容块/文字行分页生成 PDF/PNG。
model-catalog.ts: 声明式模型目录与文字/图像默认模型。

共享状态与浏览器能力
demo-fixtures.ts: 完全虚构的患者、化验、症状、随访和固定提取示例。
demo-session.tsx: Demo 跨页内存 CRUD、派生统计与重置，不访问真实服务或本机持久化。
theme.tsx: 主题、强调色和 DOM 同步；persist=false 时仅保留会话偏好。
locale.tsx: 语言、页面标题与文档语义同步；persist=false 时不读写本机偏好。
accent.ts: 八色预设、可读强调文字和独立临床语义色。
brand.ts: 知见 / MyOncode 名称、简介、页面标题和下载前缀；不修改持久化技术标识。
brand.test.ts: 跨格式展示、PWA identity、存储/导出兼容及 CSP 引导脚本 hash 回归。
copy.ts: 页面、壳层与操作反馈的中英文文案。
privacy.ts: 隐私门控和隐私页面的共享文案。
background-audio.tsx: 单一音频实例、播放意图、曲目切换与浏览器拦截状态。
background-audio-tracks.ts: 本地授权歌单 manifest 和稳定曲目 id。
pwa.ts: 生产 service worker 注册与敏感请求缓存边界。
network-status.ts: 在线检测与需要网络的操作反馈。
error-reporting.ts: 仅上报固定路由及已知错误类别，清理任意文本和堆栈。
async-resource.ts: 异步加载、重新加载与迟到结果隔离。
calendar-date.ts: 本地日历日期校验、日数差和日期偏移。
clipboard.ts: 剪贴板写入与兼容降级。
utils.ts: 类名合并等无业务状态工具。

测试
同名 *.test.ts / *.test.tsx: 对应模块的协议、边界和行为回归。
app.spec.ts: 路由、认证、公开 Demo 与共享 Provider 装配。
auth-session-migration.test.tsx / supabase-session-client.test.ts: 真实认证/客户端入口的迁移与存储失败行为。
auxiliary-record-storage.test.ts: 症状/随访写入归属及失败传播。
error-reporting.dom.test.tsx: 上报隐私、监听清理和失败不递归。
extraction-identity.test.ts: 模型身份清洗、可信身份保留与重复读数合并。
preference-storage.dom.test.tsx: 浏览器偏好存储不可用时，主题和语言仍可在当前会话切换。
capacitor-mobile-shell.test.ts: 已有移动壳配置、原生标识与签名隔离合同。
security-headers.test.ts: CSP、主题引导 hash 与安全响应头。
file-size-contract.test.ts: src、functions、supabase 中源码文件的 800 行上限。

边界: 页面组合数据和动作，不重复实现存储/权限协议。Demo、账户会话与真实服务保持隔离。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md。
