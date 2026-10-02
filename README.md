<div align="center">
  <img src="public/logo-island-lighthouse.png" alt="Firefly-Isle logo" width="140" />
  <h1>Firefly-Isle</h1>
  <p><strong>一页萤屿，晚期癌症患者治疗方案管理助手。</strong></p>
  <p>One-page oncology treatment timeline and record builder.</p>
  <p>Keep it running, make it helpful.</p>
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

本项目源于癌症患者及其家属的真实需求。晚期癌症患者由于频繁复发和疾病进展，往往需要经历多线治疗。在整理病历和治疗信息的过程中，患者及家属常因信息过载而感到无助；而在异地就医或门诊沟通中，由于患者数量众多，医生能够分配给单个患者的沟通时间有限，难以进行充分、系统的交流。因此，本项目旨在帮助患者更好地进行治疗方案与病历信息的管理。

## 当前本地开发基线

当前实现包含 Dashboard、病历/指标/症状/随访、可恢复表单、复诊摘要、模型设置、账户管理与配额。代码已统一到本仓库，旧自托管实验中的有效准备工作已整合；生产配置仍连接 Supabase Cloud。

新黑白双主题与八种强调色的规范见 [设计入口](DESIGN.md)，正式布局迁移等待用户选择。旧 V4 预览代码已移除，历史图片保留作证据。产品名称正在重选，当前仓库名保留兼容，不代表最终命名。

当前交付范围和真实缺口见 [17 项功能验收表](docs/products/saas-acceptance.md)，数据关系与逐表权限见 [数据模型](docs/architecture/data-model.md)。本地检查、云端开发和生产可用分别验收。

新增数据库迁移必须在发布新版前端前应用；本地完成不代表远端已部署。迁移顺序与验证方法见 [临床工作流发布说明](docs/operations/clinical-workflow-release.md)。

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
