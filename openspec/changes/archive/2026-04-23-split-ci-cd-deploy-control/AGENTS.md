# split-ci-cd-deploy-control/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
proposal.md: 说明为什么要拆分 GitHub CI/CD、关闭 Cloudflare Git 自动部署，并把 GitHub Actions 收敛为唯一发布入口
design.md: 记录 CI / CD 工作流拆分、tag/手动触发约束、Cloudflare Pages 分支自动部署关闭策略与 GitHub Secret 依赖
tasks.md: 执行清单，跟踪 workflow 重构、文档同步、Cloudflare 配置切换与验证状态
specs/: deployment delta spec，定义 GitHub Actions 负责 CI 与显式 CD、Cloudflare 不再作为自动部署真源

.openspec.yaml: OpenSpec 变更元数据，声明 schema 与创建日期。

法则: CI 证明代码可被信任，CD 只在显式发布时触发，Cloudflare Pages 只是托管目标而不是第二套自动部署真源。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
