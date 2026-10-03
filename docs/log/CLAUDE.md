# docs/log/
> L2 | 父级: /CLAUDE.md

成员清单
CLAUDE.md: 说明 commit history 文档目录的职责、命名规则与证据等级，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
index.md: commit history 总入口，按时间顺序列出日志文件、命名规则与阅读方式，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
0001-*.md ~ 0022-*.md: 每个 git commit 一份历史日志，记录实际完成过程、问题、证据与置信度，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
0023-auth-login-wechat-learning.md: 认证学习专题复盘，解释邮箱/Google/Supabase/微信登录的原理、数据流、外部配置、排错与后续步骤，不对应单个 commit，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: 默认每个 commit 一文件；专题复盘必须显式标注“不对应单个 commit”。git 是事实真相源，推断必须显式标注置信度。

0024-426c97c-record-integrity-and-design.md: 病历事务、分享/额度、状态修复、旧预览清理和独立设计交付的实测提交日志。
0025-238948d-monochrome-design-review.md: 黑白主题、八种强调色、页面方案与浏览器验收的提交日志。

0026-6bd3b94-selfhost-integration.md: 自托管准备整合、匿名会话修复、运维边界与本地验收证据。
0027-5eb85a7-data-boundaries.md: 显式 Data API 权限、创建幂等、捐赠原子记账与真实服务验收。
0028-a4b3191-saas-workflows.md: 化验与认证流程、账户导出、独立 Demo 和实际 PDF/PNG 验收。
0029-2754acd-development-ci.md: 开发分支与手动 CI 的触发范围及独立发布边界。
0030-90e931f-offline-runtime-validation.md: PWA 缓存隐私、离线图标、构建版本交接与真实 Cloudflare 预览证据。
0031-medclear-naming-decision.md: 知见 / Medclear 品牌与专业化定位定稿、规划及未迁移/未核验边界，随对应提交记录。
0032-english-name-domain-recheck.md: 用户撤回 Medclear、保留知见、新英文候选与 .com/.cn 实查，英文尚未选定。
