# 知见 / MyOncode 设计入口

当前设计任务是 AI Native 前端提案：极简首页，用户输入资料或目的后按任务展开。A/B及更早视觉稿均作为历史参考；本轮不要求继续选A/B，也没有选定新的完整页面方案。

## 当前材料

从 [OpenDesign交接说明](docs/design/current/README.md) 开始；只提供其中列出的五个文件。任务书保留确认的品牌、全程管理定位与17项功能，流程与虚构数据用于检查干净首页、处理/核对和保存后的结构化记录。

首轮已由OpenDesign本机Codex生成，并完成关键浏览器检查，见[原型评审记录](docs/design/PROTOTYPE-REVIEW.md)。只使用本轮材料与虚构数据，未安装MCP插件，也未接入正式前端。具体首页路由、视觉规范、组件映射和自然语言任务调度仍待审核。

## 历史材料

[历史设计索引](docs/design/archive/README.md)集中保存原docs/design下的Image-2 V1—V4、Stitch、A评审板、Figma说明、旧产品设计资料和A/B交付副本。旧根入口也有原文快照。历史稿不作为默认必读输入，其中旧品牌、固定配色与“当前真源”措辞不约束新提案。

[本轮来源与差异](docs/design/SOURCE-CHANGES.md)记录README、AGENTS和命名记录的更新依据；[目录地图](docs/design/AGENTS.md)区分current与archive。

## 正式实现边界

资料归档不回退已实现的品牌、共通排版、控件或长病历阅读。现有深浅主题、八种强调色、语言和用户偏好保留；运行时主题/品牌仍由src/index.css、src/lib/accent.ts、src/lib/theme/、src/lib/brand.ts和现有组件维护，public运行资源不移动。

新提案不改变已确认业务行为、身份隔离、事务保存、分享、导出或SHA完整性机制；17项功能与缺口见[验收表](docs/products/saas-acceptance.md)。登录入口与工作台首页分开评审，当前/login实现和认证流程不因本文自动改变。旧OpenSpec视觉描述需在后续相关实施中与当前代码和新决定核对，不用于恢复旧稿。

OpenDesign原型经用户审核后，再在当前项目逐页接入；后端保留，原生、小程序、生产切换与成熟版迁仓分别验收。
