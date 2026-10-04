# changes/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
complete-saas-user-workflows/: 十部分任务书下的化验审核、失败恢复、完整导出、诊断脱敏、捐赠原子状态、Demo 与云端验收合同；正式布局等待用户选择。
self-host-supabase/: 自建后端准备已整合；SMTP/OAuth、当前 schema/functions 验收与正式切换仍待完成。
archive/2026-10-02-harden-record-integrity-and-simplify/: 已完成并归档的病历/报告事务、授权码分享、配额、状态修复、代码精简及独立设计交付；当前行为见 record-integrity baseline，新视觉仍待确认。
archive/2026-10-02-superseded-refresh-product-visual-system-v4/: 废弃 V4 候选的历史证据；未应用其 delta，预览代码已移除。
add-scroll-story-landing/: 进行中变更合同，定义 /login 纵向滚动叙事落地页、GSAP ScrollTrigger 进度绑定、非 pin 分层推进、登录页 Demo CTA 移除与 reduced-motion 降级边界
fix-authenticated-empty-navigation/: 进行中变更合同，定义已登录/匿名空工作区不得把病历或统计入口降级到公开 `/demo/*`、需禁用入口并显示“先提取”说明、公开 Demo 壳层闭环保持不变的边界
calm-record-reading-surface/: 进行中变更合同，定义 `/record/:id` 与 `/demo/record` 的安静临床档案阅读层级、文字页签、次级分享 disclosure、真实能力保留与装饰性 AI/system 认证清理边界
refine-product-motion-feedback/: 活动中的正式产品动效合同，保持 V3 视觉不变，收敛 route/stagger、control press、tab switch 与 icon swap 的时长、组合、性能和 reduced-motion 边界
default-background-audio-paused/: 活动中的背景音乐默认静音合同，定义首次打开保持暂停、已保存播放意图恢复与历史偏好兼容边界
archive/: 已归档 OpenSpec 变更集合，保存历史 proposal/design/spec/tasks 作为 rationale，不作为当前 baseline 直接入口
archive/2026-05-16-add-capacitor-mobile-shell/: 已归档 Capacitor 移动壳合同，定义 iOS/Android 外壳、平台工程配置、WebView 隐私边界、移动构建脚本、native 检查受限记录与商店发布延后语义
archive/2026-05-16-add-cross-platform-pwa-foundation/: 已归档 PWA foundation 合同，定义 Web-first 跨平台入口、manifest、隐私优先 service worker、离线/弱网边界、移动 installed shell 适配与平台验证矩阵；归档时仍保留 6 个真机 installed PWA 验证任务 warning
archive/2026-05-16-add-clinical-ai-analysis/: 已归档 P0 合同，定义 /record/:id 非诊断 AI 辅助分析、PatientRecord + lab_results 输入、llm-proxy 调用边界、schema 校验、失败态和免责声明
archive/2026-05-16-add-lab-analytics-page/: 已归档统计页合同，定义 /app 实验室报告输入、/analytics/:id 与 /analytics/demo 实验室统计页、Supabase lab_report_batches / lab_results 扩展与 V3 深色临床控制塔视觉基准
archive/2026-05-16-add-secure-record-sharing/: 已归档 P0 合同，定义单份病历只读分享、授权码 hash、过期撤销、分享只读路由与 record_shares 权限边界
archive/2026-05-16-make-demo-mode-cover-full-product/: 已归档 Demo 合同，定义公开 /demo 全产品演示、统一 Demo 病历/指标、静态 AI/分享预览、真实工作区空白态与 Demo 导航 fallback
archive/2026-05-16-restore-minimal-timeline-table-view/: 已归档 P0 合同，定义 /record/:id 极简 TimelineTable 视图回归、三视图切换、复用 PatientRecord 与导出不劫持边界

add-account-profiles/: 活动中的账户档案合同，定义 profiles schema（007 迁移 + 自动建档触发器）、profile-settings 客户端读写、/settings 账户设置页与缺表降级边界

remove-private-origin-story-content/: 活动中的隐私清理合同，定义创作初衷只保留公开正文与末尾纯文本来源、使用 V3 临床档案阅读弹层、清除旧 WebGL 羊皮纸路径、历史净化与原生壳静态资源刷新

archive/2026-09-12-improve-clinical-workflows/: 已归档的临床工作流优化，包含 owner CRUD、最新状态 RPC、表单/摘要一致性、V3 可读性与隔离数据库验证；远端迁移另行发布。

法则: active change 是执行前合同；archive 是历史证据；baseline 真相仍在 /openspec/specs。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
