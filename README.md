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

## 项目背景

本项目源于癌症患者及其家属的真实需求。晚期癌症患者由于频繁复发和疾病进展，往往需要经历多线治疗。在整理病历和治疗信息的过程中，患者及家属常因信息过载而感到无助；而在异地就医或门诊沟通中，由于患者数量众多，医生能够分配给单个患者的沟通时间有限，难以进行充分、系统的交流。因此，本项目旨在帮助患者更好地进行治疗方案与病历信息的管理。

## 当前本地开发基线

当前实现包含 Dashboard、病历/指标/症状/随访导航、可恢复的症状与随访表单和复诊摘要。V3 保持纯白/纯黑背景与八种低饱和强调色，按钮文字和临床状态色分别处理。V4 仍是隔离评估页。

新增数据库迁移必须在发布新版前端前应用；本地完成不代表远端已部署。迁移顺序与验证方法见 [临床工作流发布说明](docs/operations/clinical-workflow-release.md)。

## 开发启动

### 1. 安装依赖

```bash
npm install
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
- `VITE_DEMO_RECORD_SHARE_CODE`（可选；填入公开只读分享授权码后，`/demo/*` 优先从 Supabase 读取演示病历；缺失、过期、撤销、不可用或数据不完整时回退本地完整 Demo fixture）

如果要跑认证主链路，还需要在 Supabase Dashboard 的 Auth Providers / URL Configuration 里确认：

- Email provider 已启用
- Anonymous Sign-In 已启用（否则“无需登录，直接使用匿名会话”会返回 422）
- Email 的 Confirm email / 邮箱确认已关闭；当前注册流程要求 `signUp()` 直接返回 session，才能“创建账户并登录”
- Site URL 指向有效回跳地址；如果后续重新启用验证邮件或显式传入 `emailRedirectTo`，再把当前 origin 加入 Additional Redirect URLs

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
npm run test:database
```

### 6. GitHub Actions CI + CD -> Cloudflare Pages

仓库现已按职责拆分为两条 GitHub Actions workflow：

- `.github/workflows/ci.yml`
  - 在 `main` push 与目标为 `main` 的 PR（`opened` / `synchronize` / `reopened`）时执行
  - 依次运行：
    - `npm run lint`
    - `npm run type-check`
    - `npm run test`
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

GitHub Actions 的构建期 `VITE_SUPABASE_*` 值统一从已提交的 `wrangler.jsonc > vars` 读取，不再要求在 GitHub 仓库重复配置一份 secrets / variables。公开 Demo 若要使用 Supabase 演示病历，需要同时在 `wrangler.jsonc > vars.VITE_DEMO_RECORD_SHARE_CODE` 填入可公开的只读分享码；留空时前端使用本地完整 fixture。

Cloudflare Pages 的 Git 分支自动生产 / 自动预览部署应关闭，避免与 GitHub Actions 发布链路形成双真相。

## 自建 Supabase

部署配置、备份脚本和会话迁移准备见 [自建后端手册](docs/operations/supabase-self-hosted.md)。当前生产配置仍连接 Supabase Cloud；代码整合不代表已完成数据切换。自建预览与正式切换都需要先核对当前 SaaS 的数据库迁移和函数版本。
