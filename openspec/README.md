# OpenSpec 阅读入口

先读[当前行为合同地图](specs/AGENTS.md)，再按本次改动选择相关合同。产品范围和实际验收以[核心范围](../docs/products/core-scope.md)、[验收表](../docs/products/saas-acceptance.md)及当前实现交叉核对；设计方向从 [DESIGN.md](../DESIGN.md) 进入。

## 尚有待办的清单

以下为 2026-10-04 `openspec list --json` 的本地清单快照，不是新的执行顺序，也不代表远端状态。后续使用同一命令查询最新进度。

| 变更 | 清单进度 | 入口 |
| --- | --- | --- |
| SaaS 用户流程 | 16 / 20 | [complete-saas-user-workflows](changes/complete-saas-user-workflows/tasks.md) |
| 自托管准备 | 9 / 15 | [self-host-supabase](changes/self-host-supabase/tasks.md) |
| 账户档案 | 10 / 11 | [add-account-profiles](changes/add-account-profiles/tasks.md) |

## 清单完成但尚未归档

这些目录仍保留原位置。勾选完成仅反映任务文件，不能证明生产部署、远端历史清理、设计选型或真机验收完成；本次不自动归档或修改合同。

- [登录叙事](changes/add-scroll-story-landing/tasks.md)
- [病历阅读界面](changes/calm-record-reading-surface/tasks.md)
- [已登录空工作区导航](changes/fix-authenticated-empty-navigation/tasks.md)
- [产品动效](changes/refine-product-motion-feedback/tasks.md)
- [背景音默认暂停](changes/default-background-audio-paused/tasks.md)
- [隐私清理合同](changes/remove-private-origin-story-content/tasks.md)
- [依赖与 CI 工具](changes/upgrade-dependencies-and-ci-tools/tasks.md)

<details>
<summary>已归档技术变更与历史依据（按需展开）</summary>

[历史变更目录](changes/archive/) 保留 proposal、design、tasks 和旧 delta。理解旧决策时按需查阅，不把历史视觉方案当成当前界面要求，也不将归档任务重新加入执行队列。

</details>

模块维护入口：[specs 地图](specs/AGENTS.md) · [changes 地图](changes/AGENTS.md)。新增行为、权限或跨模块合同按贡献规范处理；文档导航和目录浏览调整无需新增 OpenSpec 变更。
