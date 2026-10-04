# src/lib/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
demo-fixtures.ts: 三种完全虚构的患者模型、化验、症状、随访与固定提取示例。
demo-session.tsx: 演示唯一内存数据源，提供跨页面 CRUD、Dashboard 派生、重置和 Demo 路由映射，不使用真实服务或本机持久化。
demo-session.test.ts: 三种模型、跨读取者编辑、症状/随访 CRUD、化验重复覆盖和重置回归。
account-data-export.ts: 全用户表稳定 id 分页与小批患者查询，采集到下载持续绑定身份，保留 v1 结构并排除密钥和分享 hash。
account-data-export.test.ts: 真实查询构造器驱动的分页/行数上限、账号切换、完整下载、查询失败和敏感列排除回归。
profile-settings.ts: owner 档案读写与账户注销；档案可绑定预期账号，只有缺少可选 profiles 表时读取降级。
error-reporting.ts: 固定路由和已知错误类别的 JSON/Sentry 上报，不采集任意文本或堆栈，包含同步及异步发送失败。
error-reporting.dom.test.tsx: 全请求体隐私、Sentry event 信封、发送失败不递归与全局监听清理的回归。
supabase-session-migration.ts: 自建目标的旧会话导入、issuer 判定与迁移完成标记，保留源凭据。
supabase-session-migration.test.ts: 旧会话复制、重试、完成后退出和目标身份优先的回归。
supabase-session-client.test.ts: 真实客户端入口的配置隔离、待迁移状态、持久化标记和存储失败降级。
auth-session-migration.test.tsx: AuthProvider 的延迟刷新、认证事件、失败反馈和退出行为测试。
extraction-identity.test.ts: 可信身份保留、模型身份清洗与重复读数合并回归。
record-edit-queue.test.ts: 延迟保存与失败恢复的行为测试。
record-edit-queue.ts: 将字段补丁按顺序应用到最后成功保存状态，隔离失败请求。
background-audio-tracks.ts: 本地授权背景歌单 manifest，声明四首用户指定歌曲的稳定 id、标题、Apple Music 来源链接与 public 音频路径
background-audio.tsx: 全局背景音乐状态中心，管理单一 audio 实例、本地歌单、播放/暂停意图持久化、刷新恢复、浏览器拦截、当前曲目持久化与共享 hook
background-audio.test.ts: 背景音乐状态机回归测试，约束本地歌单默认值、曲目持久化、循环切歌、ended 前进、播放/暂停意图刷新恢复、自动播放拦截与不可用状态
app.spec.ts: 应用级合同测试，约束隐私内容、患者类型、认证路由守卫、公开 /demo/record 与 /demo/analytics、/analytics/demo、/analytics/:id 与公开 /share/:code 装配、OAuth 错误透传与 BackgroundAudioProvider 生命周期位置
capacitor-mobile-shell.test.ts: Capacitor 移动壳合同测试，约束包版本、mobile scripts、app id/name、dist webDir、无 dev-server URL、原生工程标识和 signing ignore 边界
clinical-analysis.ts: 临床辅助分析边界，把 PatientRecord 与 labResults 压缩为非诊断 LLM prompt，校验 JSON 输出并提供 analyzePatientRecord 入口
clinical-analysis.test.ts: 临床辅助分析回归测试，约束非诊断 prompt、json_object 调用、无 labResults 降级与非法响应拒绝
theme.tsx: Dark/Light、主题色和 DOM 同步；persist=false 时从默认值开始，仅保留会话内偏好。
locale.tsx: 中英文状态与文档语言同步；persist=false 时不读取或写入本机偏好。
locale.test.ts: locale 文档语义回归测试，约束 zh/en 到 HTML lang/data-locale 的映射与 LocaleProvider 同步桥接
copy.ts: app shell、background audio、login、workspace、record 的语言真相源，包含顶栏邮件联系弹窗与复制反馈、背景音乐播放/暂停/拦截文案、简洁歌单控制、简洁社交认证、无病历侧栏“先提取”提示、病历/检验报告上传、OCR/编辑/新病历/BMI 与病程资料空态文案，禁止组件继续内联双语字符串
export-record.ts: 正式病历导出工具，复用 html2canvas-pro 与 jsPDF，将现有正文隔离为带边距的浅色副本，隐藏操作，按正文块和文字行分页并压缩 PDF。
export-record.test.ts: 正式病历导出的克隆隔离、连续块分页、标题跟随、超长段落分行、压缩与下载回归测试。
file-size-contract.test.ts: 结构债回归测试，递归约束 src、functions、supabase 下 .ts/.tsx/.sql 文件均不超过 800 行
theme/: 设计系统 token 目录，收敛 surface、text、border、accent 与 motion 真相源
auth.tsx: Supabase session 恢复、URL callback 初始化、认证广播与 signOut；useOptionalAuth 允许共享 Demo 页面在未挂载认证 Provider 时读取空身份。
password-recovery.ts: 将密码修改绑定回调取得的凭据，以独立内存 AuthClient 防止其他标签的账号切换影响目标身份。
password-recovery.test.ts: 用真实 AuthClient 与请求探针验证固定身份改密、无凭据拒绝及共享登录状态不被覆盖。
auth.test.tsx: Supabase URL callback 初始化、session 恢复、认证广播、订阅清理与 signOut 的源码合同测试
llm/: 前端 LLM adapter 目录，收敛 chat 接口、provider 设置客户端、provider/model/responseFormat 请求协议、类型与错误映射
extractionPrompt.ts: PatientRecord 一句式 JSON 字段合同提示词与输出约束边界，包含 name、clinicalNotes 与治疗线证据字段，避免长 schema 或多消息 prompt 触发上游失败
extraction.ts: 信息提取主链路，负责解析、姓名/性别/年龄/身高/体重确定性补全、临床备注归一、模型 id 清洗、中文/点号日期归一化、JSON mode 上游失败降级重试、502 Gemini 系统兜底、关键缺失字段检测、带批次/派生元数据的实验室指标独立归档、追问 merge、错误文案分流与 follow-up runner
extraction.test.ts: 信息提取协议回归测试，约束结构化提取优先请求 JSON object 输出、模型 id 不污染持久化身份、密集病史末尾人口学信息补全、上游失败降级重试、502 Gemini 兜底、提示词紧凑合同、日期归一化、错误文案分流，并保持 labResults 不混入 treatmentLines
lab-dictionary.ts: 实验室指标字典与 OCR 候选归一化边界，吸收 update-followup-data 的血常规、血生化、肿瘤标志物行映射并输出稳定 itemCode、单位与参考范围
lab-dictionary.test.ts: 实验室字典回归测试，约束三类指标别名映射、参考范围解析、OCR 候选归一化与未映射行复核边界
lab-report-ingestion.ts: 化验 OCR 复核纯逻辑，保留未知候选行，校验映射/完整日期/有限数值/参考范围，确认后输出 LabResult 与 CBC 派生读数
lab-report-ingestion.test.ts: 覆盖未知行映射/排除、错误日期和数值、参考范围逆序、人工修正保存及 CBC 派生读数
lab-report-storage.ts: 单 RPC 保存/替换化验批次并返回重复状态，任一失败整笔回滚。
lab-report-storage.test.ts: 实验室报告持久化测试，约束重复批次检测、未确认替换不写入、确认后批次和读数 payload 形状
lab-results.ts: 实验室指标趋势纯逻辑，集中默认参考范围、异常分类、血常规 NLR/PLR/MLR 派生、图表序列、最近异常、肿瘤标志物连续上涨提示与非诊断输出边界
lab-results.test.ts: 实验室指标趋势回归测试，约束正常、单次异常、连续异常、缺日期、缺参考范围、CBC 派生、最近异常、图表序列与肿瘤标志物上涨检测行为
patient-metrics.ts: 患者体格指标纯逻辑，集中身高 cm、体重 kg 与 BMI 一位小数格式化，其中 /app 只展示身高体重，/record 自动计算 BMI
patient-metrics.test.ts: 患者体格指标回归测试，约束身高体重格式、BMI 计算与缺失值占位
timeline-duration.ts: 病程时间纯逻辑，集中日期清理/解析、含 ongoing 终点的时间段标签、PFS 文案与 complete/ongoing/pending 状态，供 record 档案与 treatment Gantt 共享
timeline-duration.test.ts: 病程时间合同测试，约束 baseline rail 时间段、每线 PFS、日精度约数、进行中与待补充状态
medical-document-ocr.ts: 医学文档 OCR 前端协议边界，负责图片/PDF 校验、base64 编码、Supabase JWT 透传、Edge Function 调用与本地化错误映射
medical-document-ocr.test.ts: 医学文档 OCR client 回归测试，约束图片/PDF 成功、类型拒绝、错误 envelope、空文本与浏览器不泄露 provider key
patient-record-storage.ts: 病历与子记录读取映射，按创建时间/id 游标分页读取当前账号病历摘要；单事务 RPC 核对发起账号，新草稿可传稳定 createRequestId 供失败重试复用；旧 schema 仅保留读取降级。
patient-record-storage.test.ts: 摘要分页、身份与服务端行数上限，读取映射、旧 schema 读取降级、单 RPC 保存与创建 UUID 重试协议测试；事务/RLS 由 SQL 验证。
privacy.ts: 隐私页 href、隐私门控确认 key 与共享隐私文案真相源
network-status.ts: 浏览器在线状态、OnlineRequiredError 与中英文在线依赖提示边界，供 PWA 离线壳和网络动作提前失败复用
network-status.test.ts: PWA 网络状态测试，约束显式离线检测、OnlineRequiredError 与中英文在线依赖反馈
pwa.ts: PWA service worker 注册与敏感请求缓存判定边界，确保生产安全上下文才注册外层壳缓存且动态医疗数据不进入 Cache Storage
pwa.test.ts: PWA 合同与实际 worker 事件测试，约束首次构建资源预缓存、导航响应元信息隔离、离线回退、旧缓存清理和安装元数据
record-sharing.ts: 授权码 hash、所有者管理与单 RPC 读取脱敏病历，不再通过患者 ID 读取分享数据。
record-sharing.test.ts: 病历分享回归测试，约束授权码 hash、record_shares 迁移/RLS/RPC、非 owner 拒绝、撤销写入、active/expired/revoked/unavailable 状态与单份记录读取
record-editing.ts: 自然语言病历编辑边界，要求 LLM 返回 PatientFieldTarget 字段级 patch，并复用逐格编辑的归一化 merge 语义，支持姓名、临床备注与可带单位的数值字段
record-editing.test.ts: 自然语言病历编辑回归测试，约束 basicInfo、initialOnset、treatmentLine、清空字段、带单位数值、无效目标与提示词合同
supabase.ts: Supabase 客户端初始化与环境变量边界，Auth 使用 PKCE + detectSessionInUrl，区分 Auth 所需 env、Edge Function env 与非敏感微信 custom provider id
utils.ts: 类名合并等无业务状态工具

calendar-date.ts: 本地日历日期、严格有效性、日历天差和偏移计算，不从 UTC 截取业务日期

calendar-date.test.ts: 跨时区午夜、夏令时与无效日期回归

auxiliary-record-storage.test.ts: 症状/随访存储边界测试，覆盖 owner 写入、更新字段、零行写入与失败传播

side-effect-storage.ts: 症状 owner CRUD 与日期校验；显式创建归属、编辑不覆盖身份、写后验证目标行

follow-up-storage.ts: 随访和状态 CRUD；编辑保持患者关联、校验日期顺序并反馈不可用记录

dashboard-data.ts: RLS 计数与最新指标/随访 RPC 聚合，按分区暴露错误，本地计算逾期日历天数

dashboard-data.test.ts: 聚合计数、跨患者同名指标、未授权请求与分区失败的回归

accent.ts: 八色预设与主色/按钮前景/可读强调文字的派生，临床语义色按明暗主题独立定义

accent.test.ts: 验证八色及两种主题的按钮、悬停、强调文字和状态色对比度及语义独立性

async-resource.ts: lib 的共享异步数据加载基元，统一「data/error/isLoading + 竞态守卫 + reload」样板，替代页面层手写的 active 守卫 effect；deps 变化时重置回 initialData/加载态，loader 通过 effect 内联调用，由 deps 驱动重载。
clipboard.ts: lib 的剪贴板边界，旧 execCommand 路径优先、异步 API 兜底，供顶栏联系邮箱与复诊摘要复制共用。
error-reporting.test.ts: lib 的可观测性测试，约束 DSN 形态、envelope 三段结构与脱敏负载。
model-catalog.test.ts: lib 的模型目录测试，约束目录协议字段完整、文字/图像默认模型绑定 deepseek v4 族、目录页消费共享真相源而非字面量。
model-catalog.ts: src/lib 的模型目录真相源，按「声明式目录 + 模态标注」协议收敛文字/图像默认模型；模型配置页与 OCR/LLM 边界都从这里读默认值，禁止在组件层散落模型名字面量。
security-headers.test.ts: lib 的安全头合同测试，约束 CSP 只允许自身脚本（内联主题引导按 hash 白名单）、Supabase 网络域、自托管字体与 Google 头像域，并保持 HSTS 与点击劫持防护存在。
side-effect-storage.test.ts: lib 的副作用存储测试，约束 row→record 映射不丢字段、severity 合法值不越界。

法则: 基础设施集中在这里，页面只消费结果，不重复发明边界。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。

async-resource.test.tsx: 真实 hook 生命周期验证输入切换、重载、失败恢复、initialData 与卸载时的迟到结果隔离，替代旧源码字符串测试。
升级兼容：异步资源在输入/重载变化时条件重置；Auth 缺配置就绪与反馈用初始化/派生值表达，保留 useOptionalAuth 和 Demo 无认证 Provider 的边界。
