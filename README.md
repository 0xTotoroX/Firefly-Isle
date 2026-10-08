<div align="center">
  <img src="public/logo-island-lighthouse.png" alt="知见" width="140" />
  <h1>知见 / MyOncode</h1>
  <p><strong>面向肿瘤患者与家属的全程管理工具。</strong></p>
  <p>
    中文 |
    <a href="README.en.md">English</a>
  </p>
  <p>
    <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-RLS-3FCF8E?logo=supabase&logoColor=white" />
    <img alt="Tencent Cloud Makers" src="https://img.shields.io/badge/Tencent_Cloud-Makers-0052D9?logo=tencentqq&logoColor=white" />
  </p>
</div>

公开体验入口为 `/demo`（登录后的侧栏也有“体验演示”）。演示覆盖总览、三种虚构病历、录入与化验核对、症状、随访、设置和模型预览；页面共用内存状态，刷新或“重置演示”后恢复。提取、识别与 AI 只返回标注的固定示例，演示不读取或写入真实账户，PDF/PNG 导出在浏览器内完成。

## 项目背景

知见 / MyOncode，是面向肿瘤患者与家属，集病历整理、治疗追踪、指标管理与疾病信息理解于一体的全程管理工具。它是患者的资料与追踪中枢：把检查、诊断、用药和治疗记录串成时间线，持续记录指标、副作用与随访，为回看治疗经过和就诊沟通提供依据。

后续计划增加基因检测报告解读，展示具体变异与信号通路的关联，并说明依据和不确定性；该能力尚未实现。产品以专业信息管理和理解支持为主，不以情绪陪伴为核心功能，不替代医生诊疗或承诺治疗效果。

## 当前本地开发基线

当前实现包含 Dashboard、病历/指标/症状/随访、可恢复表单、复诊摘要、模型设置、账户管理与配额。代码已统一到本仓库，旧自托管实验中的有效准备工作已整合；当前公开测试入口已连接腾讯云上海自托管 Supabase。

设计入口为 [DESIGN.md](DESIGN.md)；[current](docs/design/current/README.md) 是给 OpenDesign 的本轮材料，[archive](docs/design/archive/README.md) 保存 A/B 及更早的全部视觉资料。当前 Web 界面、页面标题、PWA 显示名与下载名称已适配“知见 / MyOncode”，共用黑白中性色、八种强调色和可读的文字层级；用户已要求从 AI Native 和极简首页重新提案；[首轮原型](docs/design/PROTOTYPE-REVIEW.md)已通过OpenDesign本机Codex生成并做关键浏览器检查，仍待视觉评审，未接入正式页面。灯塔图标暂时沿用，候选 M 图标未定稿；本地原生壳显示名已同步为知见，Checkout 商品名已同步为 MyOncode donation；真机、支付服务部署与发布另行验收。仓库已更名为 `0xTotoroX/myoncode`，包名为 `myoncode`；存储键、账号导出协议与原生标识保持兼容。`myoncode.com` 已购买并实名，2026-10-08 控制台显示管局审核中；新域名尚未启用，商标与微信名称仍待核验；见 [命名与定位](docs/products/product-naming.md)。Open Design 是项目外工具，本轮仅提供设计任务材料与虚构数据，未提供正式源码、凭据或真实病历。

当前交付范围和真实缺口见 [17 项功能验收表](docs/products/saas-acceptance.md)，数据关系与逐表权限见 [数据模型](docs/architecture/data-model.md)。本地检查、云端开发和生产可用分别验收。

新增数据库迁移必须在发布新版前端前应用；本地完成不代表远端已部署。迁移顺序与验证方法见 [临床工作流发布说明](docs/operations/clinical-workflow-release.md)。

## 项目结构

| 边界 | 目录与职责 |
| --- | --- |
| Web 前端 | `src/`：React 路由、组件、状态、浏览器服务客户端与样式；`public/`：运行资产、PWA 与托管静态配置。`src/lib/` 不是服务端。 |
| 主要后端 | `supabase/functions/`：Deno LLM、OCR、支付等函数；`supabase/migrations/`：PostgreSQL 表、RLS、事务 RPC；`supabase/tests/`：数据库验证。Auth 与数据库由 Supabase 提供。 |
| 微信适配 | 根目录 `functions/`：Cloudflare Pages Functions OAuth 桥接预研，微信登录尚未正式开放。 |
| 运行与发布 | `ops/`：自托管、备份与恢复；`.github/`：CI/CD；`scripts/`：验证脚本。 |
| 移动端壳（非当前重点） | `mobile/ios/`、`mobile/android/`：包装同一个 Web `dist/`；`mobile/capacitor.test.ts` 检查配置与路径。没有独立原生业务 UI。 |
| 构建与检查配置 | `config/`：TypeScript、Vite/Vitest、ESLint 与 Capacitor 配置正文。 |
| 开发合同与说明 | `openspec/`：行为规范、活动任务与历史技术决策；`docs/`：设计资料、数据模型、验收、运维及历史说明。 |

阅读 Web 主干可从 `src/main.tsx` → `src/App.tsx` → `src/routes/` 开始：路由组合页面，`src/components/` 渲染界面，`src/lib/records/`、`labs/`、`workspace/` 处理对应业务。原生工程单独收在 `mobile/`，日常 Web 开发无需进入。开发与构建配置集中在 [config/](config/AGENTS.md)。根 `tsconfig.json`、`eslint.config.js`、`capacitor.config.ts` 仅保留项目引用或自动发现入口；Cloudflare 的 `wrangler.jsonc` 与 shadcn 的 `components.json` 保留默认发现位置。日常继续使用下方 npm 命令。

目录职责和维护规则从 [AGENTS.md](AGENTS.md) 进入。当前 UI 使用 Radix 交互基元与自研壳层/业务组件；`components.json` 的 `radix-nova` 配置不是完整的新设计系统组件清单。运行时主题在 `src/index.css`、`src/lib/accent.ts` 和 `src/lib/theme/`。

## 文档导航与浏览

从[文档入口](docs/README.md)查当前范围、验收和设计材料，从[OpenSpec 入口](openspec/README.md)区分待办、清单完成和已归档合同。历史资料的导航默认折叠，原文件和路径保留。

VS Code/Cursor 项目视图通过 [.vscode/settings.json](.vscode/settings.json) 隐藏 node_modules、dist、coverage、output、work；需要时将对应排除项设为 false。该设置不改变 Finder，也不保证影响 Codex 文件树。

## 开发启动

### 1. 安装依赖

使用 Node.js 22 和仓库锁文件：

```bash
npm ci
```

### 2. 配置环境变量

复制示例文件并填写 Supabase 项目值：

```bash
cp .env.local.example .env.local
```

需要的变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_EDGE_FUNCTION_URL`

如果要跑认证主链路，还需要在 Supabase Dashboard 的 Auth Providers / URL Configuration 里确认：

- Email provider 已启用
- Anonymous Sign-In 已启用（否则“无需登录，直接使用匿名会话”会返回 422）
- Email 确认可开启：注册成功但无 session 时显示待确认；关闭确认时直接登录。正式邮件投递需配置可用 SMTP
- Site URL 指向当前前端；Additional Redirect URLs 包含该前端的 `/auth/callback` 与 `/auth/reset-password`，分别用于确认邮件/OAuth 和设置新密码

如果要跑 LLM adapter / Edge Function，还需要在 Supabase 项目里配置：

- secret：`GEMINI_API_KEY`
- function env：`DEFAULT_GEMINI_MODEL=gemini-2.5-flash`
- secret：`DEEPSEEK_API_KEY`
- function env：`DEFAULT_DEEPSEEK_MODEL=deepseek-v4-flash`
- function env：`DEFAULT_LLM_PROVIDER=deepseek`（当前系统内置模型路径）
- 可选 function env：`DEEPSEEK_BASE_URL=https://api.deepseek.com`

### 3. 启动开发环境

```bash
npm run dev
```

### 4. 配置并部署 llm-proxy（5.x）

在 Supabase 项目里先配置 secret、默认 provider 和默认模型：

```bash
supabase secrets set \
  GEMINI_API_KEY="<your-gemini-api-key>" \
  DEFAULT_GEMINI_MODEL="gemini-2.5-flash" \
  DEEPSEEK_API_KEY="<your-deepseek-api-key>" \
  DEFAULT_DEEPSEEK_MODEL="deepseek-v4-flash" \
  DEFAULT_LLM_PROVIDER="deepseek" \
  DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

然后部署函数：

```bash
supabase functions deploy llm-proxy
```

部署完成后，前端统一通过 `src/lib/llm/index.ts` 的 `chat(messages, options)` 调用该函数，不直接访问 Gemini 或 DeepSeek。当前系统内置路径是 `DEFAULT_LLM_PROVIDER=deepseek` + `DEFAULT_DEEPSEEK_MODEL=deepseek-v4-flash`；回滚模型 provider 时只需把 `DEFAULT_LLM_PROVIDER` 改回 `gemini` 并重新部署/刷新函数配置。

### 5. 验证当前基线

```bash
npm run build
npm run lint
npm run type-check
npm run test
# Requires Docker and a locally cached postgres:18-alpine image
docker pull postgres:18-alpine
npm run test:database
```

数据库检查从零执行全部应用迁移，再验证事务、配额竞争、逐表权限和注销去向；只使用合成数据，不连接远端。它使用最小 Auth 替身，真实注册、邮件与会话仍需另外验收。

### 6. GitHub Actions CI + CD → 腾讯云 Makers

`ci.yml` 在 main/codex 分支、PR 和手动运行时验证 lint、类型、隔离数据库、测试覆盖率与构建。`cd.yml` 仅由 `v*` tag 或手动触发，校验源码属于 main 后，使用 Node.js 22 执行 `npm run build:edgeone`，通过固定版本 EdgeOne CLI 上传 `dist/` 到现有 `myoncode` 项目。

发布需要 repo secret `EDGEONE_PAGES_API_TOKEN`；它只进入发布步骤，不进入公开构建。公开 `VITE_` 值集中于 `config/frontend.json`，腾讯云构建与 CI/CD 共用。备案获批前保持全球可用区（不含中国大陆）；大陆加速、正式域名和后端直连分别验收。旧 Cloudflare 入口暂作回退，不再由本仓库 CD 更新。

当前部署、登录限制、域名切换与回退步骤见[腾讯云操作单](docs/operations/tencent-cloud-cutover.md)。公开 Demo 始终使用虚构资料，不初始化真实账户。

## 自建 Supabase

部署配置、备份脚本和会话迁移准备见 [自建后端手册](docs/operations/supabase-self-hosted.md)。现有测试入口已连接上海后端；旧测试资料未导入。新 API 域名直连与正式上线仍须验证，不把本机构建当成发布。

## 云端开发与国内上线

[Codex Cloud 手册](docs/operations/codex-cloud.md)记录环境安装、启动、独立任务验收与成果回到 GitHub 的方式。本机个人 Skills 和凭据不随仓库自动同步；云端检查不代替本地浏览器和导出验收。

[国内上线评估](docs/products/domestic-launch.md)区分 Supabase Cloud、自托管和前端托管选择，以及备案、微信主体/类目与小程序技术路线。Web 是第一里程碑；小程序单独交付。域名已选定为 myoncode.com，浙江个人备案处于管局审核中；腾讯云 Makers 与上海后端已有测试部署，支付与正式上线另验。

## 许可证

Copyright (c) 2026 Ghibli1024。此许可修订中有权授权的自有代码采用
[AGPL-3.0-only](LICENSE)，允许依许可商用。对受覆盖程序的分发和修改版本的
网络源码提供要求见 [LICENSING.md](LICENSING.md)。此前 MIT 授予不追溯撤回；
第三方代码、字体、图标和音频保留各自许可。登录、隐私提示及共享顶栏提供“源码与许可”入口；构建附带对应版本的源码包、内容摘要和许可材料，不依赖旧远端代码。音乐等素材不改授 AGPL，保留原声明；本次不调查音乐权限，见 [第三方说明](THIRD_PARTY_NOTICES.md)。本地构建不自动发布或部署。
