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
    <img alt="Cloudflare Pages" src="https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflarepages&logoColor=white" />
  </p>
</div>

公开体验入口为 `/demo`（登录后的侧栏也有“体验演示”）。演示覆盖总览、三种虚构病历、录入与化验核对、症状、随访、设置和模型预览；页面共用内存状态，刷新或“重置演示”后恢复。提取、识别与 AI 只返回标注的固定示例，演示不读取或写入真实账户，PDF/PNG 导出在浏览器内完成。

## 项目背景

知见 / MyOncode，是面向肿瘤患者与家属，集病历整理、治疗追踪、指标管理与疾病信息理解于一体的全程管理工具。它是患者的资料与追踪中枢：把检查、诊断、用药和治疗记录串成时间线，持续记录指标、副作用与随访，为回看治疗经过和就诊沟通提供依据。

后续计划增加基因检测报告解读，展示具体变异与信号通路的关联，并说明依据和不确定性；该能力尚未实现。产品以专业信息管理和理解支持为主，不以情绪陪伴为核心功能，不替代医生诊疗或承诺治疗效果。

## 当前本地开发基线

当前实现包含 Dashboard、病历/指标/症状/随访、可恢复表单、复诊摘要、模型设置、账户管理与配额。代码已统一到本仓库，旧自托管实验中的有效准备工作已整合；生产配置仍连接 Supabase Cloud。

设计入口为 [DESIGN.md](DESIGN.md)；[current](docs/design/current/README.md) 是给 OpenDesign 的本轮材料，[archive](docs/design/archive/README.md) 保存 A/B 及更早的全部视觉资料。当前 Web 界面、页面标题、PWA 显示名与下载名称已适配“知见 / MyOncode”，共用黑白中性色、八种强调色和可读的文字层级；用户已要求从 AI Native 和极简首页重新提案；[首轮原型](docs/design/PROTOTYPE-REVIEW.md)已通过OpenDesign本机Codex生成并做关键浏览器检查，仍待视觉评审，未接入正式页面。灯塔图标暂时沿用，候选 M 图标未定稿；本地原生壳显示名已同步为知见，Checkout 商品名已同步为 MyOncode donation；真机、支付服务部署与发布另行验收。仓库、存储键、账号导出协议和部署标识保持兼容。域名未购买，购买前须重新核验可注册性、商标与微信名称；见 [命名与定位](docs/products/product-naming.md)。Open Design 是项目外工具，本轮仅提供设计任务材料与虚构数据，未提供正式源码、凭据或真实病历。

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

### 6. GitHub Actions CI + CD -> Cloudflare Pages

仓库现已按职责拆分为两条 GitHub Actions workflow：

- `.github/workflows/ci.yml`
  - 在 `main` / `codex/**` 分支 push、指向 `main` 的 PR 或手动运行时执行
  - 依次运行：
    - `npm run lint`
    - `npm run type-check`
    - `npm run test:database`
    - `npm run test:coverage`
    - `npm run build`
- `.github/workflows/cd.yml`
  - 仅在 `v*` tag push 或手动 `workflow_dispatch` 时执行
  - 重新构建 `dist/`，并通过 `wrangler pages deploy` 发布到 Cloudflare Pages 生产环境
  - 会额外校验：待部署 commit 必须属于 `main`

GitHub 侧发布前只需要配置：

- repo secret: `CLOUDFLARE_API_TOKEN`

Cloudflare Pages 继续作为托管目标，保留：

- Project: `firefly-isle`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: `22`
- SPA fallback: `public/_redirects`

GitHub Actions 的构建期 `VITE_SUPABASE_*` 值统一从已提交的 `wrangler.jsonc > vars` 读取，不再要求在 GitHub 仓库重复配置一份 secrets / variables。公开 Demo 始终使用本地虚构资料，无需配置分享码，也不初始化真实账户。

Cloudflare Pages 的 Git 分支自动生产 / 自动预览部署应关闭，避免与 GitHub Actions 发布链路形成双真相。

## 自建 Supabase

部署配置、备份脚本和会话迁移准备见 [自建后端手册](docs/operations/supabase-self-hosted.md)。当前生产配置仍连接 Supabase Cloud；代码整合不代表已完成数据切换。自建预览与正式切换都需要先核对当前 SaaS 的数据库迁移和函数版本。

## 云端开发与国内上线

[Codex Cloud 手册](docs/operations/codex-cloud.md)记录环境安装、启动、独立任务验收与成果回到 GitHub 的方式。本机个人 Skills 和凭据不随仓库自动同步；云端检查不代替本地浏览器和导出验收。

[国内上线评估](docs/products/domestic-launch.md)区分 Supabase Cloud、自托管和前端托管选择，以及备案、微信主体/类目与小程序技术路线。Web 是第一里程碑；小程序单独交付。域名、运营主体、正式托管和支付方案尚未选定，不因开发环境发布自动切换产品生产服务。
