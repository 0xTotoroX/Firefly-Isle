# 本轮参考与取舍

这些链接用于理解设计方法，不授权外部模型读取项目、历史稿或真实资料。未实际读取的页面不得声称已复刻；品牌方案仅作审美参考。

## 审美方向

| 来源 | 可以借鉴 | 不直接沿用 |
| --- | --- | --- |
| [Kami](https://github.com/tw93/Kami) | 用文字层级、墨色与留白建立秩序，低装饰的信息呈现 | 印刷优先、全宋体、紧行距、固定纸色与大幅封面；不能直接当作交互应用规范 |
| [Yohaku](https://github.com/Innei/Yohaku) | 用户此前认可的安静、简约、阅读与留白方向；具体页面需实际查看再判断 | 不把其完整产品布局、品牌或未核实组件当作本项目方案 |

原研哉、宫崎骏与东方美学来自用户审美描述，只转化为克制、自然、日常和空间秩序的方向，不声称获得其官方规范或使用其角色、作品素材。

本轮不附 A/B、Image-2 V1—V4、Stitch 或旧 Figma 页面。它们已退出本轮默认输入；不从旧布局反推新需求。

## OpenDesign 工作方式

- [官方项目](https://github.com/nexu-io/open-design)：原型、设计系统、模板和编码 Agent 的组合能力。
- [React 导出规则](https://github.com/nexu-io/open-design/blob/main/plugins/_official/scenarios/od-react-export/SKILL.md)：合理最小组件边界、React 18 + TypeScript、沿用已有样式方案、清楚的 props 与无障碍语义；导出不等于已接入业务。
- [设计包规范](https://github.com/nexu-io/open-design/blob/main/docs/design-systems.md)：当前主线定义 manifest、DESIGN.md、tokens.css 等包资源；正式建包时按安装版本复核，不要求本轮事先生成成熟规范。

优先选择原型生成流程，不选择“导入现有仓库并迁移”作为第一步。部分模板带大标题、营销区段和默认卡片，这些默认值不应覆盖 BRIEF 的首页极简要求。如模板与任务冲突，说明冲突并选更适合的流程。

OpenDesign 的目录分类和迁移计划只服务于其工作流程，不授权重排产品源码。最终组件职责、状态、路由和接口应由正式项目的约定与可运行证据决定。
