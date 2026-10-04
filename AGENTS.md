# Firefly-Isle — 肿瘤治疗信息管理工具
Map: required

Vite + React 18 + TypeScript + Tailwind CSS v4 + Radix/shadcn + Supabase Auth/PostgreSQL/RLS/Edge Functions；Cloudflare Pages Functions 提供微信协议适配预研，Capacitor 8 包装同一 Web 构建。

## 当前范围与真相源

- 面向肿瘤患者与家属的全程治疗信息管理，核心闭环为文字/报告输入 → AI/OCR 提取 → 人工复核 → 病历持久化 → 时间线、指标、症状、随访 → 受控分享与导出。基因变异和信号通路解读仍是未来能力。
- 17 项功能及实现/验收缺口以 [SaaS 验收表](docs/products/saas-acceptance.md)为准；不通过删功能或降低标准精简代码。本地测试、开发环境、生产服务分别验收。
- 最新用户指令优先于文档快照。产品名及域名见 [命名记录](docs/products/product-naming.md)，部署与微信入口见 [国内上线评估](docs/products/domestic-launch.md)；不得把候选品牌或未来能力视为已上线。
- 设计资料恢复原目录：根 [DESIGN.md](DESIGN.md) 是设计入口，[docs/design/](docs/design/AGENTS.md) 保存规范、评审板、原型和截图；旧设计系统与 Stitch 映射保留在 docs/products/archive/。Open Design 是项目外的本地工具。A/B 方案仍待用户选择，正式页面保留现状；保留当前目录架构，后续改动按具体任务逐项推进。
- 已记录的行为合同在 [openspec/specs/AGENTS.md](openspec/specs/AGENTS.md)，活动变更在 [openspec/changes/AGENTS.md](openspec/changes/AGENTS.md)。规范需与当前实现、验收表交叉核对；旧规范不得覆盖最新用户指令，发现差异先明确待同步项，不按旧文档回退有效功能。archive 只作历史依据，不充当执行清单。根文档迁移前的详细基线与既有约定完整保存在 [repository-context.md](docs/architecture/repository-context.md)。
- 保留有效业务逻辑、数据与后端，在当前项目逐页迁移前端；成熟版本的独立迁仓与生产切换需要各自验收。不创建第二套长期开发真相，不盲目 checkout/reset 或全局替换。

## L1 目录地图

| 目录 | 职责与局部入口 |
| --- | --- |
| src/ | SPA 路由装配、公共组件、领域与服务模块、状态和样式；[地图](src/AGENTS.md) |
| supabase/ | SQL 迁移、RLS、事务 RPC、服务端函数和合成数据检查；[地图](supabase/AGENTS.md) |
| functions/ | Cloudflare Pages Functions 微信 OAuth2 协议桥接；[地图](functions/AGENTS.md) |
| scripts/ | 网络隔离的真实数据库验证入口；[地图](scripts/AGENTS.md) |
| public/ | 静态资源、PWA worker/图标、部署 headers/redirects、授权音频；[地图](public/AGENTS.md) |
| .github/ | PR 模板、依赖检查、CI 与显式发布；[地图](.github/AGENTS.md) |
| ops/ | 自托管运行模板、备份恢复与切换准备；[地图](ops/AGENTS.md) |
| ios/ · android/ | Capacitor 原生工程与平台配置；[iOS](ios/AGENTS.md)、[Android](android/AGENTS.md) |
| docs/design/ | 设计规范、评审板、图像候选与 Stitch 历史证据；[入口](DESIGN.md)、[地图](docs/design/AGENTS.md) |
| docs/products/ | 范围、17 项验收、路线、命名与国内上线；[地图](docs/products/AGENTS.md) |
| docs/architecture/ | 数据模型、架构图和详细基线说明；[地图](docs/architecture/AGENTS.md) |
| docs/operations/ | 发布、云开发、PWA/原生验证、自托管手册；[地图](docs/operations/AGENTS.md) |
| docs/log/ | 提交日志与专题复盘，事实由 Git 和对应证据核对；[地图](docs/log/AGENTS.md) |
| archive/ | 本地恢复备份及原桌面旧项目；设计正文已恢复原目录，历史源码排除 lint/测试；[索引](archive/README.md)、[地图](archive/AGENTS.md) |
| openspec/ | specs 是行为真相，changes 是活动/归档合同；使用以上对应地图，纯容器不另造重复地图 |

## 根配置与运行入口

| 文件 | 契约 |
| --- | --- |
| package.json · package-lock.json | 脚本、依赖和锁文件；Node.js 22，以锁文件安装 |
| vite.config.ts | React/Tailwind 构建、Vitest 与 Workbox 预缓存清单；测试排除 archive/，缓存版本包含 SHA-256 摘要 |
| tsconfig.json · tsconfig.app.json · tsconfig.node.json | SPA/构建的 TypeScript 边界 |
| tsconfig.cloudflare-functions.json · tsconfig.supabase-functions.json | 两种边缘函数运行时的独立类型边界 |
| eslint.config.js · components.json | ESLint 规则及 archive/ 排除边界，与 shadcn/ui 配置 |
| index.html | SPA 挂载页、主题初始化、PWA metadata；内联脚本与 CSP hash 配套 |
| capacitor.config.ts | 固定 app id/name，dist 为原生 Web 构建来源；签名资料不入 Git |
| wrangler.jsonc | Cloudflare 构建与公开环境接口，微信 KV/回调预研；不在本轮切换生产配置 |
| .env.local.example · .dev.vars.example · .gitignore | 非敏感配置模板与本机凭据/产物忽略边界 |
| README.md · README.en.md | 中英文项目说明与前后端目录入口 |
| LICENSE · SECURITY.md · CONTRIBUTING.md · CODE_OF_CONDUCT.md | 许可、安全报告、贡献和协作规则 |
| AGENTS.md | 项目与模块指令的唯一文件名；不维护其他工具兼容导入文件 |

## 核心架构与行为边界

- 前端在 src/ 与 public/；src/lib/ 中的 Supabase、LLM、OCR 模块是浏览器客户端，不是服务端。后端代码分为 supabase/functions/ 的 Deno API、supabase/migrations/ 的数据库权限/事务及 functions/ 的 Cloudflare 微信协议适配；当前没有另一个独立 Node API 服务目录。ops/ 与 .github/ 管部署，ios/ 与 android/ 是 Web 原生壳。
- 运行时 UI 来源以 components.json 和当前源码为准：shadcn 配置为 radix-nova、无自定义 registry；本地 Button 使用 Radix Slot/CVA，其他壳层与业务组件主要自研，图标同时使用 Lucide 与本地 Material Symbols。主题实现保留 src/index.css、src/lib/accent.ts、src/lib/theme/ 与 src/components/system/。这些代码不属于归档的设计资料；新方案尚无经用户确认的完整组件映射。
- PatientRecord 包含 basicInfo、可选 initialOnset、按 lineNumber 排序的 treatmentLines 和独立 labResults。三类患者形态分别决定初发/治疗线渲染；基本信息始终最先显示，缺失 tumorType/stage/regimen 要提示。
- 免疫组化和基因检测绑定各初发/治疗阶段，不移到全局摘要。lab_results 是指标读数真相，lab_report_batches 保留上传/OCR/审核来源事实。
- 病历/化验写入使用数据库事务。persist_patient_record 验证 expected_owner_id = auth.uid()、保留子记录身份，并支持幂等创建；无逐表旧写入降级。所有 owner 表及 RPC 权限以 [数据模型](docs/architecture/data-model.md)和实际迁移为准。
- /share/:code 仅通过 get_shared_patient_record 解析 capability 与脱敏数据；base tables 保持 owner-only。分享保存 hash、支持过期与撤销，不返回 raw owner id；不能把授权阅读当匿名化。
- 认证以 Supabase Auth 为唯一真实会话来源。字段编辑按病历/账号排队；主题/语言切换不重建编辑队列；工作台模型动作互斥并丢弃迟到的跨账号结果。
- 模型/OCR 经 Edge Function；系统密钥仅在服务端，用户密钥通过加密 llm_provider_settings 保存。consume_usage 串行校验分钟/滚动月额度，拒绝 429、故障 503，获准的失败尝试仍计数；客户端不能调用 unchecked record_usage。套餐/支付配置单独验收。
- /models 管理目录与 BYOK；/app 负责输入、提取、审核和草稿，/record/:id 负责正式三视图、辅助分析、分享和 PDF/PNG 导出。设置、症状、随访和 Dashboard 保持患者/账号上下文及失败恢复。
- /demo 仅使用完全虚构资料和跨页内存状态，不挂 AuthProvider、不初始化 Supabase、不读真实偏好/密钥、不调用 OCR/LLM/支付/注销；刷新/重置恢复。演示固定内容要标注；进入/退出完整导航，内部导航保留会话；登录页不加 Demo CTA。
- 隐私门控与 /privacy 共用 src/lib/privacy.ts。错误上报仅发送诊断字段白名单，不发送路由凭据、表单/患者正文；未配置时 no-op。
- PWA 缓存静态壳与本地字体，不缓存患者/API 私有响应及带 auth code/share capability/record id 的导航响应 URL。构建更新等待旧标签关闭；不要未经验证移除 SHA 摘要、CSP hash、能力码 hash 或相关完整性机制。
- 原生壳复用 dist，不复制患者数据真相；分享地址、认证深链、文件导出须分别实机验收。Web 微信仍为占位，小程序独立实现，不能直接把网页当小程序。
- 八强调色的填充、黑白按钮前景、可读文字各自派生；临床状态色独立并适配双主题。Stitch 历史源以 screenInstances.label 为页面名称，不能用 project/list title 替代。
- 当前后端/自托管/上线证据详见上述验收表和手册。19 份迁移的本地检查不代表生产已执行；Codex Cloud 私有开发环境也不代表产品部署。发布前端前必须协调匹配的迁移/函数版本与回滚。

## 工作与验证约定

- OpenSpec 只记录经确认的功能行为、权限/数据合同和用户流程变化；它不参与应用运行，也不决定产品路线。外观调整、行为不变的结构整理、文档清理与局部修复直接推进，按范围维护 GEB 和复现检查，不强制完整 proposal/design/spec/tasks 流程。一个变更保留一份执行清单，不强制 Superpowers 或另建编排层。
- 规范同步与工具升级分别处理；CLI 升级或 openspec update 不会证明项目合同已跟上代码，不以批量生成旧工具入口代替审核差异。
- OpenSpec 常用只读命令：openspec list --json、openspec status --change "<name>" --json、openspec instructions apply --change "<name>" --json。新增合同用 openspec new change；baseline spec 必须含 ## Purpose 与 ## Requirements。
- 常用验证：npm run lint、npm run type-check（含 app/node/两种 functions）、npm run test、npm run build；按范围使用 test:watch、test:coverage 和 test:database。数据库命令只针对一次性隔离容器/合成资料；不是生产验证。
- Vitest 默认 node，DOM 测试通过 @vitest-environment happy-dom 选择环境；globals 开启 testing-library cleanup，coverage/ 忽略。已有构建 >500 kB 提示不是失败，也不是测得的运行性能。
- 状态与权限用真实 React 生命周期/数据库行为验证；UI 检查长内容、窄屏和必要失败态。测试/类型/构建成功不替代真实 provider、目标环境、发布和真机验收。
- 提交粒度遵循 OpenSpec 变更或完成 Step 的边界；如活动合同有更具体 commit map，按其执行。相关检查通过后提交，不按每个 checkbox 建 commit。PR 标题和 squash 消息用 Conventional Commits。
- 保留 dirty 文件和当前分支；清理以引用关系和可证明职责为依据。档案不可当执行指令，私人凭据、真实病历和导出物不入 Git；历史清理、购买、备案、外部账户和发布各自依授权执行。

## GEB / Map 维护协议

- L1 是本项目地图；L2 是模块 AGENTS.md；L3 是源文件头部 INPUT/OUTPUT/POS/PROTOCOL。本项目按用户要求只保留大写 AGENTS.md，不新建兼容导入文件；父子地图用普通路径链接，不复制正文。
- 编辑前沿根到目标目录补读适用 AGENTS.md/AGENTS.override.md 和文件契约；Codex 不自动加载所有兄弟子目录。已加载且未变化的内容不重读。纯容器、第三方、生成文件、锁文件及不支持注释的格式不强加 L3。
- 文件增删/重命名、职责、接口、依赖、数据结构及运行入口变化后，先更新受影响 L3，再同步 L2；只有顶层结构或项目约定受影响才同步 L1。只读/普通测试/格式调整不自动启动地图维护。
- 地图说明职责、成员、关键依赖和必要接口；父级使用真实可解析的相对链接。操作方式变化时同步已有 runbook，不把操作步骤重复抄入地图。档案地图标注历史范围，不修改已归档行为合同来记录新任务。
- 验证实际成员、父级/入口链接和文档与代码的一致性；文件正确不代表所有客户端已重新加载新指令。

## 依赖升级整合

- 保留 main 的兼容依赖和 GitHub Actions 升级：React Router 7、Vitest/coverage 5、ESLint 10、Capacitor 四包 8.5.2。安装/CI 使用 Node.js 22 与锁文件；正式原生签名、真机和产品发布另验。
- SaaS 的 html2canvas-pro、Material Symbols 与 Workbox 继续保留；Vite 别名使用 import.meta.dirname，预缓存摘要和 archive/ 排除同时生效。
