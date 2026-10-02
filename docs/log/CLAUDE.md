# docs/log/
> L2 | 父级: /CLAUDE.md

成员清单
CLAUDE.md: 说明 commit history 文档目录的职责、命名规则与证据等级，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
index.md: commit history 总入口，按时间顺序列出日志文件、命名规则与阅读方式，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
0001-*.md ~ 0022-*.md: 每个 git commit 一份历史日志，记录实际完成过程、问题、证据与置信度，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
0023-auth-login-wechat-learning.md: 认证学习专题复盘，解释邮箱/Google/Supabase/微信登录的原理、数据流、外部配置、排错与后续步骤，不对应单个 commit，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: 默认每个 commit 一文件；专题复盘必须显式标注“不对应单个 commit”。git 是事实真相源，推断必须显式标注置信度。

0024-426c97c-record-integrity-and-design.md: 病历事务、分享/额度、状态修复、旧预览清理和独立设计交付的实测提交日志。
