# .github/
> L2 | 父级: /CLAUDE.md

成员清单
CLAUDE.md: 说明 GitHub 自动化目录边界与工作流职责，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
PULL_REQUEST_TEMPLATE.md: 定义 PR 提交说明、验证清单、文档同步清单与 Conventional Commits 标题约束，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
workflows/ci.yml: main/codex 分支 push、main PR 与手动检查入口；验证 lint、完整类型、空库/RLS、测试覆盖率和构建，PR 另检查 Conventional Commits 标题，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
workflows/cd.yml: GitHub Actions CD 工作流，负责 tag/手动触发的 Cloudflare Pages 发布，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: workflow 先验证再发布，Secrets/Vars 只声明接口不写死敏感值。
