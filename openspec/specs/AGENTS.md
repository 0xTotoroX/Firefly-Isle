# specs/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
record-integrity/spec.md: 病历/批次事务、可信身份、授权码分享、稳定编辑与双窗口原子配额的当前基线。
app-shell/spec.md: 页面壳层、路由范围、登录入口与 feature 组件边界的 baseline spec
asset-storage/spec.md: Supabase Storage 基础设施、用户隔离与 MVP 上传范围的 baseline spec
auth/spec.md: 邮箱登录、密码重置、Google OAuth、匿名模式、隐私条款门控与 session 持久化的 baseline spec
background-audio/spec.md: 应用级背景音乐控制器、播放偏好、自动播放拦截与路由切换稳定性的 baseline spec
background-audio-playlist/spec.md: 本地授权背景歌单、曲目选择持久化、切歌与资源边界的 baseline spec
capacitor-mobile-shell/spec.md: Capacitor iOS/Android 本地壳、dist Web build 包装、原生平台工程、隐私边界、平台验证矩阵与商店发布延后语义的 baseline spec
clinical-ai-analysis/spec.md: /record/:id 非诊断 AI 辅助分析、结构化输出、失败态与免责声明的 baseline spec
commit-history/spec.md: docs/log 提交日志粒度、证据来源与置信度标注的 baseline spec
conversational-record-editing/spec.md: 已有病历自然语言编辑、字段级 merge 与失败重试边界的 baseline spec
cross-platform-pwa-foundation/spec.md: Web-first 跨平台入口、PWA manifest、隐私优先 service worker、离线/弱网边界、移动 shell 与平台验证矩阵的 baseline spec
demo-mode/spec.md: 公开 /demo 的全产品虚构 fixture、跨页内存 CRUD、固定 AI/OCR 示例、模式内导航和零真实账户服务边界。
deployment/spec.md: 部署入口、Cloudflare Pages 与发布控制的 baseline spec
editing/spec.md: 时间线表格字段编辑、blur 保存、空白高亮、布局稳定性、工作台最新检测摘要、既往检测历史、诊断日期前置与紧凑病程轨道的 baseline spec
export/spec.md: 正式档案导出、PDF/PNG 行为与导出边界的 baseline spec
info-extraction/spec.md: 自然语言/OCR 确认文本提取、关键字段追问、三轮上限、紧凑 JSON 字段合同、JSON mode 上游失败降级重试与 502 Gemini 系统兜底的 baseline spec
lab-analytics-page/spec.md: /analytics/:id 与 /analytics/demo 实验室统计页面、趋势图、异常摘要与非诊断提示的 baseline spec
lab-report-ingestion/spec.md: /app 检验报告输入、OCR 复核、批次保存、重复检测与失败不污染记录的 baseline spec
lab-result-trends/spec.md: labResults 分组趋势、参考范围、派生指标、最近异常与肿瘤标志物上涨提醒的 baseline spec
llm-adapter/spec.md: chat 适配器、Edge Function 代理、模型参数与错误处理的 baseline spec
llm-provider-settings/spec.md: /models 独立设置与工作区链接、可展开 compact 面板、preset/custom provider/model、第三方医疗数据披露、加密密钥持久化与非明文回读的 baseline spec
medical-document-ocr/spec.md: 医学文档图片/PDF OCR、服务端密钥边界、文本确认与失败不污染 PatientRecord 的 baseline spec
patient-record/spec.md: PatientRecord 数据结构、可选 labResults 缺失不阻断主病历、治疗线与三类患者判定的 baseline spec
record-sharing/spec.md: 授权码只读分享、hash 存储、过期撤销、公开 /share/:code 与权限边界的 baseline spec
record-treatment-gantt/spec.md: /record/:id 治疗方案甘特图视图、baseline+治疗线投影、左右固定/中间可拖动、PFS、补充资料展示、开放当前线与空态的 baseline spec
supabase-schema/spec.md: Supabase 表结构、llm_provider_settings provider/model 约束、RLS、区域选择与 updated_at 触发器的 baseline spec
theme-system/spec.md: Dark/Light主题token与切换合同、当前/历史设计来源边界；旧V3登录视觉条款待与当前实现核对，不约束新提案
timeline-table/spec.md: 时间线表格渲染、检测信息归属、空字段与基本信息顺序的 baseline spec

clinical-workflow/spec.md: 症状/随访归属、最新状态、日历日期、可恢复表单、上下文导航和 V3 可读性的 baseline spec。

法则: 主规格必须是 baseline，不再保留 `## ADDED Requirements` / `## MODIFIED Requirements` 这类 delta 头。

同步边界: 格式验证不能证明所有合同与当前代码一致。app-shell 仍含早期 MVP 页面范围，部分已完成 change 也尚未归档；接手时结合 src/App.tsx、当前验收表与相关活动合同核对，不按旧描述删改已有页面。最新用户需求优先，归档和整体合同同步在相应功能工作中验收。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
