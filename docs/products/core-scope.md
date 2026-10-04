# 产品范围与实现规则

## 当前目标

知见 / MyOncode，是面向肿瘤患者与家属，集病历整理、治疗追踪、指标管理与疾病信息理解于一体的全程管理工具。它组织整个治疗与随访过程中的检查、诊断、用药和治疗记录，为回看与就诊沟通提供依据，不限定为诊前工具或晚期患者专用产品。

专业化优先解决资料遗漏、理解困难和管理负担；情绪安慰与长期陪伴不作为核心功能或品牌主线。信息准确、来源可查、变化清晰、结论有边界是产品要求，不代表所有解读已完成验证，也不承诺治疗效果。SaaS 化在本阶段指账号隔离、可靠保存、清楚的状态与一致的交互；企业自动化是设计板的组织参考，不代表产品转型为工作流平台。

核心闭环：输入文字或报告 → AI/OCR 提取 → 人工复核和补充 → 持久化病历 → 查阅时间线与检验趋势 → 复诊沟通、受控分享和导出。

| 范围 | 决定与原因 |
| --- | --- |
| 保留并优先验收 | 病历输入、提取、最多三轮追问、逐字段编辑、治疗线、化验报告、只读趋势、症状与随访、授权码分享、PDF/PNG 导出。每个操作必须有可观察结果和失败反馈。 |
| 必要支撑 | 认证、账号与数据隔离、隐私/删除/导出、模型设置、配额、错误报告、公开演示。它们保护核心闭环。 |
| 维持已有边界 | PWA、Capacitor 壳、背景音乐、环境开关控制的捐赠/计费基础。已有独立职责与合同，本轮没有证据支持整块删除，不扩展它们。 |
| 后续规划 | 基因检测报告中的具体变异与信号通路关联解读，带来源、证据与不确定性说明；尚未实现，需另立 OpenSpec 合同与验收。 |
| 延后 | 微信正式登录、小程序、商业套餐、团队协作、跨设备协同编辑、新视觉上线。明确需求和验收再实施。 |
| 已移除 | `/design-preview`、`/brand-lockup-preview` 及只供它们使用的组件、CSS、测试；统计页无法落库的临时编辑；逐表删除重建式保存；重复的深浅主题工作台入口；进程内额度计数及先查询后记账路径。 |

设计入口为根 [DESIGN.md](../../DESIGN.md)。用户要求从AI Native与极简首页重新提案；current只放本轮输入，archive保留全部历史视觉，A/B不再作为必选路线。已实现的品牌、主题偏好、可读控件和连续长病历继续保留。新布局、最终图标、原生实机与小程序另验；基因/通路/靶点知识解读仍为未来规划，域名尚未购买。

## 复用与结构

继续用现有 React、Radix/shadcn、Tailwind 和 Supabase。当前只固定了部分基础组件来源：components.json 使用 radix-nova、无自定义 registry，本地 Button 使用 Radix Slot/CVA；壳层和业务组件主要自研。A/B 新方案尚无确认的完整组件清单和映射，不将已有依赖视为已经覆盖全部新交互，也不为换肤直接引入另一套完整 UI 框架。Carbon 曾用于研究语义颜色、状态与层级，并非已接入的运行组件库。数据事务使用 PostgreSQL RPC，前端队列只处理当前页面按顺序提交，不宣称支持跨设备冲突合并。

2026-10-02 复核了两个仍维护的医疗时间线实现。[Medplum PatientTimeline](https://github.com/medplum/medplum/blob/main/packages/react/src/PatientTimeline/PatientTimeline.tsx) 可参考事件分组和临床日期处理，但直接接入依赖 FHIR、MedplumClient 与 Mantine，需要转换现有 PatientRecord/Supabase 边界。[cBioPortal 独立时间线包](https://github.com/cBioPortal/cbioportal-frontend/blob/master/packages/cbioportal-clinical-timeline/package.json) 支持 React 18，但当前包标识为 AGPL-3.0-or-later，另引入 MobX 等依赖。现有三视图已覆盖本产品需求，暂保留它们，不为了复用之名增加模型迁移和许可证决策。

清理按可证明的职责和引用关系进行；保留原有数据、有效功能和回退记录。文件超过某个行数是审查信号，不替代行为、接口与复杂度判断。

## OpenSpec、Superpowers 与验收

保留轻量 OpenSpec：经用户确认的新能力、权限/数据合同或用户流程变化先写可观察行为及失败边界。外观调整、行为不变的模块拆分、文档清理和局部修复直接推进，按范围更新架构说明与相关检查，不要求完整的 proposal/design/spec/tasks 流程。每次工作只保留一份执行清单，避免 OpenSpec tasks、另一套计划和 Agent 汇报重复维护。

产品方向由最新用户指令和确认的需求决定。OpenSpec 不参与运行或构建，也不自动决定架构、设计方案或重写范围；旧合同需结合源码与当前验收表核对，发现过时内容先标记并在对应工作中同步，不为符合旧描述回退有效功能。CLI 版本更新和合同内容同步分别验收。

Superpowers 不作为本项目每项任务的必经流程。复杂设计需要评审时按需使用；明确的局部修复不用再走一轮泛化头脑风暴。Skills 按实际任务选择，例如 Supabase 权限、文档渲染、Git 交付；不安装或强制启用新的编排框架，也不修改全局 Skill 配置。

验收要求：

- 数据和权限：真实 PostgreSQL 上验证事务回滚、身份保持、跨用户拒绝、授权码、过期/撤销及额度竞争；仅 mock 或搜索源码字符串不能证明数据库正确。
- 状态：在真实 React 生命周期下延迟请求，验证主题/语言变化、连续编辑、失败恢复、切换病历与账号。
- 界面：浏览器检查真实长内容、必要的错误状态和受影响尺寸；“能构建”不能代表“能操作”。
- 交付：必要测试、类型检查、lint、构建通过后本地提交。远端迁移、生产登录/LLM/支付、原生真机分别验收，不能拿本地通过替代。

依据：[OpenSpec 工作流](https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md)允许按任务选择路径；[Superpowers 执行计划](https://github.com/obra/superpowers/blob/main/skills/executing-plans/SKILL.md)与[完成前验证](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md)提供可选执行/证据纪律。这里采用适合项目的部分，不复制整套流程。
