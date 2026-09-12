# src/lib/
> L2 | 父级: /src/CLAUDE.md

成员清单
CLAUDE.md: 说明前端基础设施模块职责，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
background-audio-tracks.ts: 本地授权背景歌单 manifest，声明四首用户指定歌曲的稳定 id、标题、Apple Music 来源链接与 public 音频路径，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
background-audio.tsx: 全局背景音乐状态中心，管理单一 audio 实例、本地歌单、播放/暂停意图持久化、刷新恢复、浏览器拦截、当前曲目持久化与共享 hook，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
background-audio.test.ts: 背景音乐状态机回归测试，约束本地歌单默认值、曲目持久化、循环切歌、ended 前进、播放/暂停意图刷新恢复、自动播放拦截与不可用状态，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
app.spec.ts: 应用级合同测试，约束隐私内容、患者类型、认证路由守卫、公开 /demo/record 与 /demo/analytics、/analytics/demo、/analytics/:id 与公开 /share/:code 装配、OAuth 错误透传与 BackgroundAudioProvider 生命周期位置，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
capacitor-mobile-shell.test.ts: Capacitor 移动壳合同测试，约束包版本、mobile scripts、app id/name、dist webDir、无 dev-server URL、原生工程标识和 signing ignore 边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
clinical-analysis.ts: 临床辅助分析边界，把 PatientRecord 与 labResults 压缩为非诊断 LLM prompt，校验 JSON 输出并提供 analyzePatientRecord 入口，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
clinical-analysis.test.ts: 临床辅助分析回归测试，约束非诊断 prompt、json_object 调用、无 labResults 降级与非法响应拒绝，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
theme.tsx: Dark / Light 主题状态、持久化与 document 根节点主题标记同步，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
locale.tsx: 全局 locale 状态中心，负责 zh / en 切换、持久化恢复、HTML lang/data-locale 同步与 useLocale 消费入口，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
locale.test.ts: locale 文档语义回归测试，约束 zh/en 到 HTML lang/data-locale 的映射与 LocaleProvider 同步桥接，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
copy.ts: app shell、background audio、login、workspace、record 的语言真相源，包含顶栏邮件联系弹窗与复制反馈、背景音乐播放/暂停/拦截文案、简洁歌单控制、简洁社交认证、无病历侧栏“先提取”提示、病历/检验报告上传、OCR/编辑/新病历/BMI 与病程资料空态文案，禁止组件继续内联双语字符串，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
export-record.ts: 正式病历导出工具，复用 html2canvas 与 jsPDF 生成 PDF/PNG，并在克隆 DOM 中清洗现代 CSS 色值供 /record/:id 独占消费，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
export-record.test.ts: 正式病历导出工具回归测试，约束 PDF/PNG 继续走共享截图、分页、下载链路与 html2canvas 安全色/背景图/滤镜降级，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
file-size-contract.test.ts: 结构债回归测试，递归约束 src、functions、supabase 下 .ts/.tsx/.sql 文件均不超过 800 行，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
theme/: 设计系统 token 目录，收敛 surface、text、border、accent 与 motion 真相源
auth.tsx: Supabase session 恢复、URL callback 初始化、认证状态广播与 signOut 边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
auth.test.tsx: Supabase URL callback 初始化、session 恢复、认证广播、订阅清理与 signOut 的源码合同测试，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
llm/: 前端 LLM adapter 目录，收敛 chat 接口、provider 设置客户端、provider/model/responseFormat 请求协议、类型与错误映射，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
extractionPrompt.ts: PatientRecord 一句式 JSON 字段合同提示词与输出约束边界，包含 name、clinicalNotes 与治疗线证据字段，避免长 schema 或多消息 prompt 触发上游失败，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
extraction.ts: 信息提取主链路，负责解析、姓名/性别/年龄/身高/体重确定性补全、临床备注归一、模型 id 清洗、中文/点号日期归一化、JSON mode 上游失败降级重试、502 Gemini 系统兜底、关键缺失字段检测、带批次/派生元数据的实验室指标独立归档、追问 merge、错误文案分流与 follow-up runner，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
extraction.test.ts: 信息提取协议回归测试，约束结构化提取优先请求 JSON object 输出、模型 id 不污染持久化身份、密集病史末尾人口学信息补全、上游失败降级重试、502 Gemini 兜底、提示词紧凑合同、日期归一化、错误文案分流，并保持 labResults 不混入 treatmentLines，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-dictionary.ts: 实验室指标字典与 OCR 候选归一化边界，吸收 update-followup-data 的血常规、血生化、肿瘤标志物行映射并输出稳定 itemCode、单位与参考范围，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-dictionary.test.ts: 实验室字典回归测试，约束三类指标别名映射、参考范围解析、OCR 候选归一化与未映射行复核边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-report-ingestion.ts: 网页端实验室报告摄入纯逻辑，把 OCR 文本转为可编辑复核行，并在确认后输出可保存 LabResult 与 CBC 派生读数，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-report-ingestion.test.ts: 实验室报告摄入测试，约束 OCR candidate 复核、保存前修正、未解析行阻塞/排除和 CBC 派生 payload，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-report-storage.ts: 实验室报告批次持久化边界，负责同日同分类重复检测、替换确认、lab_report_batches 插入和关联 lab_results 写入，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-report-storage.test.ts: 实验室报告持久化测试，约束重复批次检测、未确认替换不写入、确认后批次和读数 payload 形状，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-results.ts: 实验室指标趋势纯逻辑，集中默认参考范围、异常分类、血常规 NLR/PLR/MLR 派生、图表序列、最近异常、肿瘤标志物连续上涨提示与非诊断输出边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-results.test.ts: 实验室指标趋势回归测试，约束正常、单次异常、连续异常、缺日期、缺参考范围、CBC 派生、最近异常、图表序列与肿瘤标志物上涨检测行为，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
patient-metrics.ts: 患者体格指标纯逻辑，集中身高 cm、体重 kg 与 BMI 一位小数格式化，其中 /app 只展示身高体重，/record 自动计算 BMI，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
patient-metrics.test.ts: 患者体格指标回归测试，约束身高体重格式、BMI 计算与缺失值占位，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
timeline-duration.ts: 病程时间纯逻辑，集中日期清理/解析、含 ongoing 终点的时间段标签、PFS 文案与 complete/ongoing/pending 状态，供 record 档案与 treatment Gantt 共享，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
timeline-duration.test.ts: 病程时间合同测试，约束 baseline rail 时间段、每线 PFS、日精度约数、进行中与待补充状态，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
medical-document-ocr.ts: 医学文档 OCR 前端协议边界，负责图片/PDF 校验、base64 编码、Supabase JWT 透传、Edge Function 调用与本地化错误映射，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
medical-document-ocr.test.ts: 医学文档 OCR client 回归测试，约束图片/PDF 成功、类型拒绝、错误 envelope、空文本与浏览器不泄露 provider key，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
patient-record-storage.ts: 患者记录持久化边界，统一 patients/basic_info/clinical_notes、treatment_lines、可选 lab_results 与 lab_report_batches 的读取、归属校验、只读分享读取、映射与落库同步，缺失 clinical_notes 或 lab_results 远端迁移时不阻断主病历读写，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
patient-record-storage.test.ts: 患者记录持久化合同测试，约束假 id 新建真实 patient、record-page 字段编辑落库、lab_results/lab_report_batches row 映射、缺表/缺列读写降级、payload 形状、迁移字段与 RLS ownership 检查，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
privacy.ts: 隐私页 href、隐私门控确认 key 与共享隐私文案真相源，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
network-status.ts: 浏览器在线状态、OnlineRequiredError 与中英文在线依赖提示边界，供 PWA 离线壳和网络动作提前失败复用，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
network-status.test.ts: PWA 网络状态测试，约束显式离线检测、OnlineRequiredError 与中英文在线依赖反馈，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
pwa.ts: PWA service worker 注册与敏感请求缓存判定边界，确保生产安全上下文才注册外层壳缓存且动态医疗数据不进入 Cache Storage，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
pwa.test.ts: PWA 合同测试，约束 manifest 安装字段、headers、SPA 深链路 fallback、service worker 注册条件与敏感动态请求缓存排除，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-sharing.ts: 病历分享边界，负责授权码生成/hash、record_shares 创建/列表/撤销、分享链接生成与授权码只读读取状态，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-sharing.test.ts: 病历分享回归测试，约束授权码 hash、record_shares 迁移/RLS/RPC、非 owner 拒绝、撤销写入、active/expired/revoked/unavailable 状态与单份记录读取，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-editing.ts: 自然语言病历编辑边界，要求 LLM 返回 PatientFieldTarget 字段级 patch，并复用逐格编辑的归一化 merge 语义，支持姓名、临床备注与可带单位的数值字段，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-editing.test.ts: 自然语言病历编辑回归测试，约束 basicInfo、initialOnset、treatmentLine、清空字段、带单位数值、无效目标与提示词合同，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
supabase.ts: Supabase 客户端初始化与环境变量边界，Auth 使用 PKCE + detectSessionInUrl，区分 Auth 所需 env、Edge Function env 与非敏感微信 custom provider id，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
utils.ts: 类名合并等无业务状态工具，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

calendar-date.ts: 本地日历日期、严格有效性、日历天差和偏移计算，不从 UTC 截取业务日期，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

calendar-date.test.ts: 跨时区午夜、夏令时与无效日期回归，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

auxiliary-record-storage.test.ts: 症状/随访存储边界测试，覆盖 owner 写入、更新字段、零行写入与失败传播，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

side-effect-storage.ts: 症状 owner CRUD 与日期校验；显式创建归属、编辑不覆盖身份、写后验证目标行，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

follow-up-storage.ts: 随访和状态 CRUD；编辑保持患者关联、校验日期顺序并反馈不可用记录，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

dashboard-data.ts: RLS 计数与最新指标/随访 RPC 聚合，按分区暴露错误，本地计算逾期日历天数，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

dashboard-data.test.ts: 聚合计数、跨患者同名指标、未授权请求与分区失败的回归，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

accent.ts: 八色预设与主色/按钮前景/可读强调文字的派生，临床语义色按明暗主题独立定义，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

accent.test.ts: 验证八色及两种主题的按钮、悬停、强调文字和状态色对比度及语义独立性，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: 基础设施集中在这里，页面只消费结果，不重复发明边界。
