<div align="center">
  <img src="public/logo-island-lighthouse.png" alt="Firefly-Isle logo" width="140" />
  <h1>Firefly-Isle</h1>
  <p><strong>One-page oncology treatment timeline and record builder.</strong></p>
  <p>A clinical record assistant for late-stage cancer treatment planning.</p>
  <p>Keep it running, make it helpful.</p>
  <p>
    <a href="README.md">中文</a> |
    English
  </p>
  <p>
    <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-RLS-3FCF8E?logo=supabase&logoColor=white" />
    <img alt="Cloudflare Pages" src="https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflarepages&logoColor=white" />
  </p>
</div>

## Product Background

Firefly-Isle comes from a real need shared by cancer patients and their families. Patients with advanced cancer often go through repeated recurrence, disease progression, and multiple treatment lines. When preparing medical records or discussing care across hospitals, information overload can make communication fragmented, while outpatient doctors often have limited time for each patient. This project helps patients and families organize treatment plans and clinical records into a clearer, more portable timeline.

## Current local development baseline

The app includes a Dashboard, patient-scoped record/lab/symptom/follow-up navigation, recoverable clinical forms and visit summaries. V3 retains white/black surfaces with eight muted presets and separate button-foreground and clinical-status colors. V4 remains an isolated evaluation surface.

Apply the new database migration before releasing the updated frontend. Local completion does not imply remote deployment. See the [clinical workflow release notes](docs/operations/clinical-workflow-release.md).

## Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase project values:

```bash
cp .env.local.example .env.local
```

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_EDGE_FUNCTION_URL`

For the auth path, confirm these settings in Supabase Dashboard / Auth Providers / URL Configuration:

- Email provider is enabled.
- Anonymous Sign-In is enabled.
- Email confirmation is disabled for the current registration flow, because `signUp()` must directly return a session.
- Site URL points to a valid redirect target. If email verification is re-enabled later, add the current origin to Additional Redirect URLs.

For the LLM adapter / Edge Function path, configure:

- secret: `GEMINI_API_KEY`
- function env: `DEFAULT_GEMINI_MODEL=gemini-2.5-flash`
- secret: `DEEPSEEK_API_KEY`
- function env: `DEFAULT_DEEPSEEK_MODEL=deepseek-v4-flash`
- function env: `DEFAULT_LLM_PROVIDER=deepseek`
- optional function env: `DEEPSEEK_BASE_URL=https://api.deepseek.com`

### 3. Start development server

```bash
npm run dev
```

### 4. Configure and deploy `llm-proxy`

Set Supabase secrets and default provider/model values:

```bash
supabase secrets set \
  GEMINI_API_KEY="<your-gemini-api-key>" \
  DEFAULT_GEMINI_MODEL="gemini-2.5-flash" \
  DEEPSEEK_API_KEY="<your-deepseek-api-key>" \
  DEFAULT_DEEPSEEK_MODEL="deepseek-v4-flash" \
  DEFAULT_LLM_PROVIDER="deepseek" \
  DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

Deploy the function:

```bash
supabase functions deploy llm-proxy
```

After deployment, the frontend calls the function only through `src/lib/llm/index.ts` and its `chat(messages, options)` boundary. The current built-in provider path is `DEFAULT_LLM_PROVIDER=deepseek` + `DEFAULT_DEEPSEEK_MODEL=deepseek-v4-flash`; to roll back to Gemini, set `DEFAULT_LLM_PROVIDER=gemini` and redeploy or refresh function configuration.

### 5. Verify baseline

```bash
npm run build
npm run lint
npm run type-check
npm run test
# Requires Docker and a locally cached postgres:18-alpine image
npm run test:database
```

### 6. GitHub Actions CI + CD -> Cloudflare Pages

The repository uses two GitHub Actions workflows:

- `.github/workflows/ci.yml`
  - Runs on `main` pushes and PRs targeting `main`.
  - Runs `npm run lint`, `npm run type-check`, `npm run test`, and `npm run build`.
- `.github/workflows/cd.yml`
  - Runs only on `v*` tag pushes or manual `workflow_dispatch`.
  - Builds `dist/` and deploys to Cloudflare Pages through `wrangler pages deploy`.
  - Verifies that the deploy commit belongs to `main`.

GitHub requires this repo secret before release:

- `CLOUDFLARE_API_TOKEN`

Cloudflare Pages remains the hosting target:

- Project: `firefly-isle`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: `22`
- SPA fallback: `public/_redirects`

Build-time `VITE_SUPABASE_*` values are read from committed `wrangler.jsonc > vars`, so the GitHub repository does not need duplicate secrets or variables for those public values.

Disable automatic production / preview deployments from Cloudflare Pages Git integration to avoid two deployment truths.
