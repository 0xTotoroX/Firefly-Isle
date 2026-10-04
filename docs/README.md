# 项目文档入口

先读当前范围、验收和设计输入；需要追溯决策时再展开历史资料。本文只做导航，不复制任务清单或重新定义功能。

## 当前工作

| 要了解什么 | 从哪里进入 |
| --- | --- |
| 项目结构与前后端位置 | [项目说明](../README.md#项目结构) · [模块地图](../AGENTS.md) |
| 本轮范围与验收缺口 | [核心范围](products/core-scope.md) · [17 项功能验收](products/saas-acceptance.md) |
| 当前设计方向与 OpenDesign 材料 | [设计入口](../DESIGN.md) → [当前交接材料](design/current/README.md)；材料准备不等于新布局已落地 |
| 品牌和名称 | [命名与定位](products/product-naming.md) |
| 当前行为合同与未归档清单 | [OpenSpec 入口](../openspec/README.md) |
| 数据关系与权限 | [数据模型](architecture/data-model.md) |
| 开发验证与增量测试 | [贡献与测试规范](../CONTRIBUTING.md#verification-incremental-by-default) |
| 发布、恢复和运行维护 | [运维目录地图](operations/AGENTS.md) |

实现事实仍需核对源码和验收证据；文档中的历史日期、旧品牌、旧视觉和清单勾选不自动代表当前产品状态。

<details>
<summary>历史与追溯资料（按需展开）</summary>

- [历史视觉索引](design/archive/README.md)：A/B、Image-2、Stitch 等旧稿；不作为当前设计的默认输入。
- [历史产品快照](products/archive/AGENTS.md)：原 PRD、目标和范围记录。
- [历史重构阶段](products/saas-refactoring-plan.md)：旧阶段记录，不是当前任务队列。
- [提交与专题日志](log/index.md)：追溯历史决策，最新事实仍以代码和验收表为准。
- [原详细架构说明](architecture/repository-context.md)：保留的文档快照，当前结构先看根地图。
- [已归档技术变更](../openspec/changes/archive/)：旧方案、任务与决策依据。
- [本地恢复备份索引](../archive/README.md)：备份载荷保留本地，未随 Git 上传。

</details>

## 日常浏览

项目的 [.vscode/settings.json](../.vscode/settings.json) 将 node_modules、dist、coverage、output、work 从兼容编辑器的文件树隐藏。目录仍在原处，构建、测试和 Git 规则不变；需要查看时，在工作区 Files: Exclude 中将对应项取消，或在 JSON 中设为 false。不要因此删除本地资料。

配置采用 [VS Code 工作区设置](https://code.visualstudio.com/docs/configure/settings#_workspace-settings)，适用于 VS Code 及兼容编辑器；不改变 Finder，也不保证 Codex 的文件树采用相同过滤。历史目录仍可直接访问；这里只折叠索引中的历史导航。
