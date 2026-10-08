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
    <img alt="Tencent Cloud Makers" src="https://img.shields.io/badge/Tencent_Cloud-Makers-0052D9?logo=tencentqq&logoColor=white" />
  </p>
</div>

Open `/demo` to try the existing product screens with three fictional patient records. Dashboard, intake, lab review, symptoms, follow-ups, settings and model previews share an in-memory session. Refreshing or resetting restores the examples. Extraction, OCR and AI return labeled fixed examples; Demo never initializes a real account or sends patient content to a service. PDF/PNG export runs in the browser.

## Product Background

MyOncode (知见) brings medical records, treatment tracking, lab trends and disease information together for patients and families throughout cancer care. It serves as a central place for tests, diagnoses, medicines, treatment history, side effects and follow-ups, helping people revisit their history and prepare for appointments.

Future work includes interpreting genetic test reports and showing relationships between specific variants and signaling pathways, with sources, evidence and uncertainty. This capability is not implemented. The product focuses on information management and understanding; emotional companionship is not a core feature. It does not replace clinical care or promise treatment outcomes.

## Current local development baseline

The app includes a Dashboard, patient-scoped record/lab/symptom/follow-up workflows, recoverable forms, visit summaries, model settings, account management and quotas. Useful self-hosting preparation has been consolidated into this repository; the public test entry now uses self-hosted Supabase in Tencent Cloud Shanghai.

Start at [DESIGN.md](DESIGN.md): [current](docs/design/current/README.md) contains the OpenDesign input packet, while [archive](docs/design/archive/README.md) preserves A/B and earlier visual material. The Web UI, browser metadata, PWA display name and download names now use 知见 / MyOncode, with shared neutral surfaces, eight accents and readable typography. The new proposal starts from AI-native interaction and a minimal home screen; the [first prototype](docs/design/PROTOTYPE-REVIEW.md) was generated through OpenDesign with local Codex and checked in a browser. Visual approval and product integration remain pending. The lighthouse icon is retained temporarily; the candidate M icon is not final. Local native-shell display names now use 知见 and the Checkout product label uses MyOncode donation; device validation, payment-service deployment and releases require separate acceptance. The repository is now `0xTotoroX/myoncode` and the package is `myoncode`; storage keys, account-export format and native identifiers stay compatible. `myoncode.com` has been purchased and verified. The filing was under authority review on 2026-10-08; the new domain is not yet serving the app. Trademark and WeChat names still require verification. See the [naming decision](docs/products/product-naming.md). Open Design remains an external local tool; only the scoped brief and synthetic fixtures were provided, without product source code, credentials or real patient records.

See the [17-capability acceptance ledger](docs/products/saas-acceptance.md) for verified behavior and remaining gaps, and the [data model](docs/architecture/data-model.md) for table relationships and RLS. Local checks, cloud development readiness and production readiness are verified separately.

Apply the new database migration before releasing the updated frontend. Local completion does not imply remote deployment. See the [clinical workflow release notes](docs/operations/clinical-workflow-release.md).

## Repository structure

| Boundary | Location and responsibility |
| --- | --- |
| Web frontend | `src/`: React routes, components, state, browser service clients and styles; `public/`: runtime assets, PWA and static hosting rules. `src/lib/` contains client code, not a server. |
| Main backend | `supabase/functions/`: Deno APIs for LLM, OCR and payments; `supabase/migrations/`: PostgreSQL tables, RLS and transactional RPCs; `supabase/tests/`: database checks. Supabase provides Auth and the database. |
| WeChat adapter | Root `functions/`: Cloudflare Pages Functions OAuth preparation. WeChat login is not yet released. |
| Operations | `ops/`: self-hosting, backup and restore; `.github/`: CI/CD; `scripts/`: local validation. |
| Mobile shells (deferred priority) | `mobile/ios/` and `mobile/android/` wrap the same Web `dist/`; `mobile/capacitor.test.ts` checks their configuration and paths. There is no separate native business UI. |
| Build and validation configuration | `config/`: TypeScript, Vite/Vitest, ESLint and Capacitor configuration bodies. |
| Contracts and documentation | `openspec/`: behavior, active tasks and historical technical decisions; `docs/`: design materials, data model, acceptance, operations and historical documentation. |

Read the Web app from `src/main.tsx` → `src/App.tsx` → `src/routes/`. Routes compose pages, `src/components/` renders them, and `src/lib/records/`, `labs/` and `workspace/` own domain logic. Native projects are isolated in `mobile/` and are not needed for everyday Web development. Development and build configuration lives in [config/](config/AGENTS.md). Root `tsconfig.json`, `eslint.config.js` and `capacitor.config.ts` retain project references or automatic discovery entrypoints; `wrangler.jsonc` and `components.json` stay at their tools’ default locations. Continue using the npm commands below.

Start at [AGENTS.md](AGENTS.md) for module maps. The existing UI combines Radix interaction primitives with custom application and feature components. The `radix-nova` configuration in `components.json` is not a complete component catalog for the proposed design. Runtime theme code stays in `src/index.css`, `src/lib/accent.ts` and `src/lib/theme/`.

## Documentation and browsing

Use the [documentation index](docs/README.md) for current scope, acceptance and design inputs, and the [OpenSpec index](openspec/README.md) for pending, checklist-complete and archived contracts. Historical navigation is collapsed by default; files remain at their existing paths.

[Workspace settings](.vscode/settings.json) hide node_modules, dist, coverage, output and work in VS Code-compatible explorers. Set an exclusion to false to show it again. These settings do not change Finder and are not guaranteed to affect the Codex file tree.

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

### 6. GitHub Actions CI + CD → Tencent Cloud Makers

`ci.yml` validates lint, types, isolated database behavior, coverage and builds on main/codex pushes, PRs and manual runs. `cd.yml` runs only on `v*` tags or manual dispatch, verifies main ancestry, builds with Node.js 22 and `npm run build:edgeone`, then uploads `dist/` to the existing `myoncode` Makers project using a pinned EdgeOne CLI.

Configure the repo secret `EDGEONE_PAGES_API_TOKEN` before deploying. This credential only enters the deploy step. Public `VITE_` build values live in `config/frontend.json`, shared by Tencent builds and CI/CD. Keep the existing overseas acceleration area until filing approval; domain activation and direct backend HTTPS require separate acceptance. The old Cloudflare entry remains a fallback and is no longer updated by this CD workflow.

See the [Tencent cutover runbook](docs/operations/tencent-cloud-cutover.md) for current deployments, domain activation and recovery. The public Demo only uses synthetic in-memory data.

## Self-hosted Supabase

Deployment configuration, backup scripts and session migration preparation are documented in the [self-hosting runbook](docs/operations/supabase-self-hosted.md). The current test site uses the Shanghai backend without importing old test data. Direct HTTPS on the new API domain and formal launch remain separate acceptance steps.

## Cloud development and domestic launch

The [Codex Cloud runbook](docs/operations/codex-cloud.md) covers installation, startup, fresh-task validation and returning changes through GitHub. Personal local skills and credentials do not automatically follow the repository. Cloud checks do not replace browser, export or device acceptance.

The [domestic launch assessment](docs/products/domestic-launch.md) compares database/frontend hosting, filing requirements, WeChat categories and mini-program options. Web is the first milestone; the mini-program is a separate deliverable. The selected domain is myoncode.com; the Zhejiang personal filing is under authority review. Tencent Makers and the Shanghai backend have test deployments; payments and formal launch remain separate.

## License

Copyright (c) 2026 Ghibli1024. Project-owned code this revision has authority to
license uses [AGPL-3.0-only](LICENSE), which permits commercial use under its
terms. See [LICENSING.md](LICENSING.md) for covered distribution and modified
network-version source delivery. Earlier MIT grants remain effective. Third-party
code, fonts, icons and audio retain their own licenses. Login, privacy and shared topbar surfaces offer a public source/license link.
The build includes its matching source archive, content digest and license materials,
without relying on an older remote revision. Music and other assets retain their
separate statements; this change does not investigate music permissions or relicense
assets. See [third-party notices](THIRD_PARTY_NOTICES.md). Building does not publish
or deploy the files.
