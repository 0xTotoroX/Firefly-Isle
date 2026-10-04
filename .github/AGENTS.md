# .github/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
PULL_REQUEST_TEMPLATE.md: 定义 PR 提交说明、按影响范围选择的增量验证与结果记录、文档同步清单及 Conventional Commits 标题约束
workflows/ci.yml: main/codex 分支 push、main PR 与手动检查入口；验证 lint、完整类型、空库/RLS、测试覆盖率和构建，PR 另检查 Conventional Commits 标题
workflows/cd.yml: GitHub Actions CD 工作流，负责 tag/手动触发的 Cloudflare Pages 发布

dependabot.yml: npm 与 GitHub Actions 的每周依赖检查及 minor/patch 分组；不自动合并更新。

法则: workflow 先验证再发布，Secrets/Vars 只声明接口不写死敏感值。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。

依赖升级：checkout/setup-node/upload-artifact 使用已在 main 验证的新版 Actions；CI 安装 Supabase CLI 并本地编译 Pages Functions，均不部署。supabase-deploy.yml 仍只手动触发。
