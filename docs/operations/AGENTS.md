# docs/operations/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
codex-cloud.md: 新版云开发环境、可移植工具、独立任务验收与 GitHub/本地主线衔接；与产品托管分开。
supabase-self-hosted.md: 自建后端配置、历史验收边界、当前 SaaS 发布依赖、备份恢复与正式切换步骤。
wechat-login-preparation.md: 小程序与网页微信的独立凭据、Supabase 正式会话桥接合同、申请材料和真实验收顺序；不代表已上线。
tencent-cloud-cutover.md: 腾讯云静态站发布、备案前 IP 技术验收、正式域名切换与回退的逐项操作单，入口依赖 products/ 第一阶段盘点。
record-integrity-release.md: 本轮迁移顺序、兼容边界、隔离验收证据与生产待验事项。
release-checklist.md: 发布前浏览器导出验收与 Supabase 安全/可用性复核清单
pwa-validation.md: PWA foundation 发布前平台矩阵、主链路验收、Cache Storage 隐私检查与回滚步骤
capacitor-mobile-shell.md: Capacitor iOS/Android 本地壳 build、sync、打开、原生工程检查、真机矩阵与签名秘密边界 runbook
supabase/README.md: Supabase 从零恢复、Auth/Storage/functions 配置与排错 runbook

clinical-workflow-release.md: 临床工作流迁移与验证；阅读及证据边界以正文为准。
side-effects-20260901-02.md: docs/operations 的会话副作用真相源，供下次接手的人区分「代码 commit」与「外部状态变更」，避免把暂停/恢复/迁移的历史误当成当前事实。

法则: operations 只记录可重复执行的运维真相，不复述源码实现细节。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
