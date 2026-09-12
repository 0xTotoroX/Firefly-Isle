# specs/
> L2 | 父级: /CLAUDE.md

成员清单
app-shell/spec.md: 页面壳层、路由范围、登录入口与 feature 组件边界的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
asset-storage/spec.md: Supabase Storage 基础设施、用户隔离与 MVP 上传范围的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
auth/spec.md: 邮箱登录、密码重置、Google OAuth、匿名模式、隐私条款门控与 session 持久化的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
background-audio/spec.md: 应用级背景音乐控制器、播放偏好、自动播放拦截与路由切换稳定性的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
background-audio-playlist/spec.md: 本地授权背景歌单、曲目选择持久化、切歌与资源边界的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
capacitor-mobile-shell/spec.md: Capacitor iOS/Android 本地壳、dist Web build 包装、原生平台工程、隐私边界、平台验证矩阵与商店发布延后语义的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
clinical-ai-analysis/spec.md: /record/:id 非诊断 AI 辅助分析、结构化输出、失败态与免责声明的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
commit-history/spec.md: docs/log 提交日志粒度、证据来源与置信度标注的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
conversational-record-editing/spec.md: 已有病历自然语言编辑、字段级 merge 与失败重试边界的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
cross-platform-pwa-foundation/spec.md: Web-first 跨平台入口、PWA manifest、隐私优先 service worker、离线/弱网边界、移动 shell 与平台验证矩阵的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
demo-mode/spec.md: 公开 /demo 全产品演示、统一 Demo fixture、可选 Supabase share-code 与真实工作区隔离的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
deployment/spec.md: 部署入口、Cloudflare Pages 与发布控制的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
editing/spec.md: 时间线表格字段编辑、blur 保存、空白高亮、布局稳定性、工作台最新检测摘要、既往检测历史、诊断日期前置与紧凑病程轨道的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
export/spec.md: 正式档案导出、PDF/PNG 行为与导出边界的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
info-extraction/spec.md: 自然语言/OCR 确认文本提取、关键字段追问、三轮上限、紧凑 JSON 字段合同、JSON mode 上游失败降级重试与 502 Gemini 系统兜底的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-analytics-page/spec.md: /analytics/:id 与 /analytics/demo 实验室统计页面、趋势图、异常摘要与非诊断提示的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-report-ingestion/spec.md: /app 检验报告输入、OCR 复核、批次保存、重复检测与失败不污染记录的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-result-trends/spec.md: labResults 分组趋势、参考范围、派生指标、最近异常与肿瘤标志物上涨提醒的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
llm-adapter/spec.md: chat 适配器、Edge Function 代理、模型参数与错误处理的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
llm-provider-settings/spec.md: 用户 LLM provider 设置、可展开 compact 面板、preset/custom provider/model、第三方医疗数据披露、加密密钥持久化与非明文回读的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
medical-document-ocr/spec.md: 医学文档图片/PDF OCR、服务端密钥边界、文本确认与失败不污染 PatientRecord 的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
patient-record/spec.md: PatientRecord 数据结构、可选 labResults 缺失不阻断主病历、治疗线与三类患者判定的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-sharing/spec.md: 授权码只读分享、hash 存储、过期撤销、公开 /share/:code 与权限边界的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-treatment-gantt/spec.md: /record/:id 治疗方案甘特图视图、baseline+治疗线投影、左右固定/中间可拖动、PFS、补充资料展示、开放当前线与空态的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
supabase-schema/spec.md: Supabase 表结构、llm_provider_settings provider/model 约束、RLS、区域选择与 updated_at 触发器的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
theme-system/spec.md: Dark/Light 主题 token、surface、登录视觉合同与主题切换的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
timeline-table/spec.md: 时间线表格渲染、检测信息归属、空字段与基本信息顺序的 baseline spec，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

clinical-workflow/spec.md: 症状/随访归属、最新状态、日历日期、可恢复表单、上下文导航和 V3 可读性的 baseline spec。

法则: 主规格必须是 baseline，不再保留 `## ADDED Requirements` / `## MODIFIED Requirements` 这类 delta 头。
