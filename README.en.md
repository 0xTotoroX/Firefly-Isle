<div align="center">
  <img src="public/logo-island-lighthouse.png" alt="知见" width="140" />
  <h1>知见 / MyOncode</h1>
  <p><strong>Cancer care management for patients and families.</strong></p>
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

Open `/demo` to try the existing product screens with three fictional patient records. Dashboard, intake, lab review, symptoms, follow-ups, settings and model previews share an in-memory session. Refreshing or resetting restores the examples. Extraction, OCR and AI return labeled fixed examples; Demo never initializes a real account or sends patient content to a service. PDF/PNG export runs in the browser.

## Product Background

MyOncode (知见) brings medical records, treatment tracking, lab trends and disease information together for patients and families throughout cancer care. It serves as a central place for tests, diagnoses, medicines, treatment history, side effects and follow-ups, helping people revisit their history and prepare for appointments.

Future work includes interpreting genetic test reports and showing relationships between specific variants and signaling pathways, with sources, evidence and uncertainty. This capability is not implemented. The product focuses on information management and understanding; emotional companionship is not a core feature. It does not replace clinical care or promise treatment outcomes.

## Current local development baseline

The app includes a Dashboard, patient-scoped record/lab/symptom/follow-up workflows, recoverable forms, visit summaries, model settings, account management and quotas. Useful self-hosting preparation has been consolidated into this repository; production still targets Supabase Cloud.

Start at [DESIGN.md](DESIGN.md): [current](docs/design/current/README.md) contains the OpenDesign input packet, while [archive](docs/design/archive/README.md) preserves A/B and earlier visual material. The Web UI, browser metadata, PWA display name and download names now use 知见 / MyOncode, with shared neutral surfaces, eight accents and readable typography. The new proposal starts from AI-native interaction and a minimal home screen; only input materials have been prepared, and no new layout has been generated or implemented. The lighthouse icon is retained temporarily; the candidate M icon is not final. Local native-shell display names now use 知见 and the Checkout product label uses MyOncode donation; device validation, payment-service deployment and releases require separate acceptance. Repository identity, storage keys, account-export format and deployment identifiers remain compatible. No domain has been purchased; availability, trademark and WeChat names require verification before registration. See the [naming decision](docs/products/product-naming.md). Open Design remains an external local tool; this work did not send repository or patient data to a model.

See the [17-capability acceptance ledger](docs/products/saas-acceptance.md) for verified behavior and remaining gaps, and the [data model](docs/architecture/data-model.md) for table relationships and RLS. Local checks, cloud development readiness and production readiness are verified separately.

Apply the new database migration before releasing the updated frontend. Local completion does not imply remote deployment. See the [clinical workflow release notes](docs/operations/clinical-workflow-release.md).

## Repository structure

| Boundary | Location and responsibility |
| --- | --- |
| Web frontend | `src/`: React routes, components, state, browser service clients and styles; `public/`: runtime assets, PWA and static hosting rules. `src/lib/` contains client code, not a server. |
| Main backend | `supabase/functions/`: Deno APIs for LLM, OCR and payments; `supabase/migrations/`: PostgreSQL tables, RLS and transactional RPCs; `supabase/tests/`: database checks. Supabase provides Auth and the database. |
| WeChat adapter | Root `functions/`: Cloudflare Pages Functions OAuth preparation. WeChat login is not yet released. |
| Operations | `ops/`: self-hosting, backup and restore; `.github/`: CI/CD; `scripts/`: local validation. |
| Mobile shells | `ios/` and `android/`: Capacitor projects loading the same Web `dist/`, without a separate native product UI. |
| Contracts and documentation | `openspec/`: behavior, active tasks and historical technical decisions; `docs/`: design materials, data model, acceptance, operations and historical documentation. |

Start at [AGENTS.md](AGENTS.md) for module maps. The existing UI combines local shadcn/Radix primitives with custom application and feature components. The `radix-nova` configuration in `components.json` is not a complete component catalog for the proposed design. Runtime theme code stays in `src/index.css`, `src/lib/accent.ts` and `src/lib/theme/`.

## Development

### 1. Install dependencies

Use Node.js 22 and the committed lockfile:

```bash
npm ci
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
- Email confirmation may be enabled: signup without a session displays a confirmation-pending state; confirmation-disabled signup signs in immediately. Production email delivery requires working SMTP.
- Site URL points to the frontend. Additional Redirect URLs must include its `/auth/callback` and `/auth/reset-password` paths for confirmation/OAuth and setting a new password.

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
docker pull postgres:18-alpine
npm run test:database
```

Database checks initialize every application migration and verify transactions, quota concurrency, table permissions and account deletion with synthetic data. They do not connect to a remote database. Real Auth registration, email and session behavior require separate acceptance.

### 6. GitHub Actions CI + CD -> Cloudflare Pages

The repository uses two GitHub Actions workflows:

- `.github/workflows/ci.yml`
  - Runs on `main` / `codex/**` pushes, PRs targeting `main`, and manual dispatch.
  - Runs `npm run lint`, `npm run type-check`, `npm run test:database`, `npm run test:coverage`, and `npm run build`.
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

## Self-hosted Supabase

Deployment configuration, backup scripts and session migration preparation are documented in the [self-hosting runbook](docs/operations/supabase-self-hosted.md). Production configuration still targets Supabase Cloud. Before preview or cutover, reconcile the target database and Edge Functions with the current SaaS version.

## Cloud development and domestic launch

The [Codex Cloud runbook](docs/operations/codex-cloud.md) covers installation, startup, fresh-task validation and returning changes through GitHub. Personal local skills and credentials do not automatically follow the repository. Cloud checks do not replace browser, export or device acceptance.

The [domestic launch assessment](docs/products/domestic-launch.md) compares database/frontend hosting, filing requirements, WeChat categories and mini-program options. Web is the first milestone; the mini-program is a separate deliverable. Naming, operating entity, production hosting and payment choices remain open. Publishing a development environment does not deploy the product.
