# .github/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
AGENTS.md: 说明 GitHub 自动化目录边界与工作流职责，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
PULL_REQUEST_TEMPLATE.md: 定义 PR 提交说明、验证清单、文档同步清单与 Conventional Commits 标题约束，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
workflows/ci.yml: GitHub Actions CI 工作流，负责 main push 与 main PR 的 Conventional Commits 标题检查、lint、type-check、test、build，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md
workflows/cd.yml: GitHub Actions CD 工作流，负责 tag/手动触发的 Cloudflare Pages 发布，[PROTOCOL]: 变更时更新此头部，并同步 AGENTS.md

法则: workflow 先验证再发布，Secrets/Vars 只声明接口不写死敏感值。

升级契约：CI 使用 checkout/setup-node/upload-artifact v7；Supabase setup-cli v3 与 Wrangler action v4 在 CI 只检查版本和编译本地函数，实际发布仍由原手动/tag 流程执行。
