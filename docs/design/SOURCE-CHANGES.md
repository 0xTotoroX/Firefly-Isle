# 本轮材料依据与差异追踪

核对日期：2026-10-04（北京时间）。实际仓库为 `/Users/Totoro/Documents/Projects/Firefly-Isle`，在已有 `main` 上准备材料。旧 Desktop 路径已不存在，没有重建旧目录或切换分支。

## 核对范围

从整合提交 `7c1e945` 比较到材料准备前的 `efddd48a608ef5eaa38fa93d5f2193cb6b644970`。重点读取 README.md、README.en.md、AGENTS.md、DESIGN.md、命名记录、产品范围与17项验收表；不按早期接手摘要覆盖较新提交。开始核对时 HEAD 为 `0b65b91`，期间出现的 `efddd48` 已再次读取并纳入。

| 提交 | 已确认变化 | 对本轮材料的影响 |
| --- | --- | --- |
| `1fabdb6` | 设计资料恢复原目录 | 整个 docs/design 纳入历史盘点，不沿用“资料只在外部备份”的旧判断 |
| `264e789` | Web工作流整理与长病历可读性改进 | 保留有效组件、状态、保存和阅读行为，不将现有产品当作空白重写 |
| `f0f0b91` | 架构指导按Map整理 | 沿用AGENTS单入口与既有模块职责，目录变动同步地图 |
| `0b65b91` | 知见 / MyOncode品牌、全程管理定位、Web排版与显示名 | BRIEF使用确认名称，覆盖记录、治疗、指标与理解支持；不再把英文写成待选 |
| `efddd48` | 原生源配置显示名和Checkout请求商品名补齐 | 不再称这些本地名称未修改；真机、函数部署、远端商户及发布仍分别验收 |

本次用户随后明确：A/B都不满意，希望从AI Native重新设计，首页非常干净；参考此前日系简约讨论。用户授权准备交接材料和按文件夹区分当前/历史，未授权生成原型、调用模型或实施前端。

## 真相源与待决项

- 名称、定位、品牌实施边界：[命名记录](../products/product-naming.md)、[README](../../README.md)、[根地图](../../AGENTS.md)。
- 功能与验收缺口：[17项验收表](../products/saas-acceptance.md)。本轮未重跑其历史产品测试，不将历史成绩写成当前验证。
- 原型输入：[current](current/README.md)。它提供可携带的设计摘要；仓库业务合同仍为实施依据。
- 历史视觉：[archive](archive/README.md)，包含旧docs/design全目录、产品archive里的视觉说明、A/B交付副本和旧入口快照。
- 尚未确认：最终布局、字体/色值/组件映射、首页路由关系、自然语言任务调度实现、新图标和成熟版迁仓版本。不能把本轮建议当作已批准实现。

## 本次路径处理

129份旧视觉资料移动、2份入口/地图保存快照、4份外部A/B交付复制归档。逐文件路径、大小和SHA-256见 [relocation-manifest.json](archive/relocation-manifest.json)。本轮材料整理未修改运行代码、public资源、依赖、生产配置和原恢复备份；25张本地QA截图继续忽略。

整理期间另有未提交的mobile目录迁移、未使用组件和主题代码清理，README与AGENTS也出现对应说明。本输入包不依赖这些具体目录，以上并发改动不纳入本轮提交；后续正式集成时重新核对工作树，不能把本记录的稳定提交基线当作之后的全部运行状态。

根 archive/manifest.json 保留恢复时的原路径/哈希，并增加指向本轮迁移清单的说明，避免把恢复历史改写成当前状态。历史设计正文保留原文；新的archive索引承担导航，旧绝对路径不作为执行命令。

theme-system规范仍含旧V3布局、橙色和登录视觉的历史合同。本轮只修正设计来源优先级，明确旧稿不能约束新提案；不顺带重写其余行为合同或改变运行默认值。后续获准实施时逐项核对需要同步的视觉条款。

## 后续更新方法

后续准备材料时先执行只读 `git status`、`git log -- README.md AGENTS.md docs/products/product-naming.md`，再比较本记录的基线与新HEAD。只把影响名称、范围、事实状态和交付边界的差异同步到current，历史设计不重新晋升为默认输入。没有实质变化时不复制一套新材料。

## 本轮检查

135项归档文件与4份外部原件哈希一致；25张QA图片继续忽略；108个当前文档本地链接及A评审HTML的7个本地资源/页面链接可解析。五文件包完整，JSON可解析，17项功能映射、纠错值与缺失参考范围一致。未启动OpenDesign、未生成原型、未运行产品全量测试。

完整暂存差异检查发现B原稿6处既有行尾空白（含Markdown换行空格），已与外部原件比对一致，按原文归档；新撰写材料及其余本轮变更通过差异格式检查，不为格式检查改写历史交付。

## 独立交接准备的后续核对

材料准备提交104d6f6之后，9fb3122已提交此前并发的mobile目录归组、未使用组件和主题代码清理。2026-10-04再次比较README、AGENTS和命名记录，品牌、产品目标、17项范围及AI Native提案边界不变；五文件包不引用被移动的原生目录或已删除的Button，故只更新输入核对基线。

独立交接与导出目录为 `/Users/Totoro/Documents/Projects/MyOncode-Design/`：input/仅保存五份材料快照，output/留给后续从OpenDesign导出的原型，根README与START说明用途，input-manifest.json记录来源提交和校验值。opendesign-input.zip只包含这五份材料，原仓库current/继续是输入正文的维护源；快照不是第二套产品仓库。

接入检查：本机OpenDesign安装包0.21.1、Codex CLI0.160.0满足官方插件版本下限；当前未安装open-design插件，也没有同名MCP注册。读取了安装包CLI帮助及官方文档，没有安装插件或修改Codex配置。PATH中的/usr/bin/od是系统命令，不能当作OpenDesign CLI。生成方式仍需按用户选择执行，不把材料准备或项目导入称为模型生成完成。

本次进一步创建了OpenDesign本地项目“知见 MyOncode · AI Native 原型”（project ID `60d9c04c-bb35-4854-bdf2-732a9c852e36`，conversation ID `d336d49d-33a9-4c99-8bf2-30e624be4ed4`）。仅使用官方project create和项目文件接口，五份材料及START.md均与输入读回一致，skillId/designSystemId为空，没有继承旧设计稿。run list实测为空，未启动模型。

启动核验补充：/Applications安装入口标记0.21.1，实际普通GUI启动加载本机已有0.24.1更新载荷。旧入口--headless报“SidecarFactory.create() requires a supervised sidecar context”，普通应用入口成功；证据支持两种启动路径的协议衔接差异，未修改程序或监督参数。文件夹原地导入返回403 desktop import token rejected，未绕过；改用新建应用自管项目后逐文件写入选定材料，未授予读取整个外部目录的能力。macOS辅助访问自动控制亦未获准，本轮未请求或修改该权限。

OpenDesign实际工作目录由应用管理，记录在本机交接目录的opendesign-project.json。源仓库current是需求正文维护源，本机input及应用内input是同一版快照，后续统一重导出；不构成三套独立维护的设计规范。压缩包只含五文件，零历史素材、代码、密钥或真实患者数据；5份输入与ZIP内容校验一致，项目内加上START共6份文本逐字一致。
