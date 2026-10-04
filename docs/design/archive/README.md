# 历史设计资料

本目录集中保存先前设计稿与来源记录，全部退出本轮默认设计输入。现在要交给 OpenDesign 的材料在 [current](../current/README.md)。归档不表示旧稿从未被采用，也不回退正式界面中的有效实现。

## 查阅入口

| 历史资料 | 位置 | 说明 |
| --- | --- | --- |
| A v1.1 评审 | [规范](saas-review/DESIGN-SYSTEM.md) · [交互评审板](saas-review/index.html) · [概念页](saas-review/concepts/index.html) | 2026-10-02 新稿及后续修改，属于真实历史候选，本轮不继续强制选 A/B |
| B 与 A/B 对比 | [评审](ab-review/MyOncode-review.html) · [离线 Demo](ab-review/MyOncode-demo.html) · [B 原稿](ab-review/CLAUDE-DESIGN.md) | 复制四份既有交付作集中查阅，外部原件保持不变；全部为虚构演示 |
| Image-2 V1—V4 | [批次索引](Image-2/AGENTS.md) | 图片、brief、提示词、历史规范及本地 QA 截图 |
| Stitch 与运行截图 | [暗色原稿](stitch/dark/firefly_precision/DESIGN.md) · [浅色原稿](stitch/light/ink_archive/DESIGN.md) · [运行截图](stitch/runtime-screenshots/AGENTS.md) | 来源记录与历史运行证据，不是新布局要求 |
| Figma 历史说明 | [figma-sync.md](figma-sync.md) | 旧同步约定，不授权执行旧命令或访问外部账户 |
| 产品目录中的旧视觉说明 | [设计系统](product-reference/design-system.md) · [Stitch 映射](product-reference/stitch-screen-mapping.md) | 从 docs/products/archive 移入；PRD、产品spec与Goal历史留在原产品目录 |
| 原设计入口与地图 | [入口快照](DESIGN.before-ai-native.md) · [地图快照](design-map.before-ai-native.md) | 保留归档前原文，其链接和“当前”措辞均属于当时快照；请用本索引导航 |

## 保存与校验

`relocation-manifest.json` 记录归档前提交、旧路径、新路径、文件大小与 SHA-256。129 份原有视觉资料按目录移动，2 份入口/地图保存原文快照，4 份外部 A/B 交付按字节复制。归档时逐文件验证内容不变。

Image-2/V4 的 25 张 `.qa*.png` 继续留在本机并被 Git 忽略；清单记录它们，不表示云端 checkout 含这些图片。外部 A/B 原件位于清单中的 task-5 路径，不在本轮移动、修改或重新测试。

历史文件中的旧品牌、绝对路径、工具命令和规范优先级保持原文，用于追溯；不作为本轮执行指令。子目录 AGENTS.md 只说明该历史批次的成员。运行中的 CSS、主题、品牌、组件和 public 资源不属于本次归档。

原恢复备份仍在根 [archive](../../../archive/README.md)。原恢复清单记录的是恢复当时的路径和校验值，本清单负责其后的路径变化；不改写恢复历史。
