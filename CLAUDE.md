# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

- This repository has completed its MVP implementation baseline. The full MVP change was archived at `openspec/changes/archive/2026-04-13-mvp-core/`.
- The commit-history documentation change was archived at `openspec/changes/archive/2026-04-14-commit-history-log/`.
- The current baseline specs now live under `openspec/specs/`.
- The input/export ownership change is archived at `openspec/changes/archive/2026-04-28-separate-workspace-input-record-export/`.
- The login intro/drawer refinement is archived at `openspec/changes/archive/2026-04-29-refine-login-intro-drawer/`.
- The DeepSeek API provider integration is archived at `openspec/changes/archive/2026-05-02-integrate-deepseek-api/`.
- The user-owned LLM provider settings work is archived at `openspec/changes/archive/2026-05-05-add-user-llm-provider-settings/`; current baseline behavior lives in `openspec/specs/llm-provider-settings/spec.md`, `openspec/specs/llm-adapter/spec.md`, and `openspec/specs/supabase-schema/spec.md`.
- Background music work is archived under `openspec/changes/archive/2026-05-03-add-background-music-toggle/` and `openspec/changes/archive/2026-05-03-add-local-background-playlist/`; current baseline behavior lives in `openspec/specs/background-audio*.md`.
- Lab analytics, P0 clinical analysis, secure sharing, restored TimelineTable, full-product Demo, PWA foundation, and Capacitor mobile shell work are archived under `openspec/changes/archive/2026-05-16-*`; current behavior lives in `openspec/specs/`.
- Product context lives in `README.md`, `README.en.md`, `docs/products/prd-implementation-status.md`, `docs/products/product-priority-roadmap.md`, `docs/products/saas-refactoring-plan.md` (SaaS refactor phases, status and pending owner decisions), and archived product snapshots / historical Goal drafts under `docs/products/archive/`.
- The V3 theme uses eight muted presets (default `#C48A4A`) from `src/lib/accent.ts`; primary fills, black/white button foregrounds and readable accent text have separate roles. Warning, critical, low and success colors remain independent of the selected preset and adapt to dark/light surfaces.
- Current visual-system entrypoint lives in `DESIGN.md`: V3 under `docs/design/Image-2/V3/DESIGN.md` remains the production source, while V4 under `docs/design/Image-2/V4/DESIGN.md` is an isolated evaluation source until an explicit direction is selected.
- Community governance now lives at the repository root: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md`.

## Common commands

### OpenSpec workflow

- `openspec list --json` — list active changes and completion state
- `openspec status --change "<change-name>" --json` — inspect artifact status for a specific active change
- `openspec instructions apply --change "<change-name>" --json` — get implementation context and task list for an active change
- `openspec new change "<name>"` — create a new change when work needs a new spec track

### Current limitation

- Verified commands at the current baseline: `npm run build`, `npm run lint`, `npm run type-check`, `npm run type-check:functions`, `npm run test`, `npm run test:watch`, `npm run test:coverage`, `npm run dev`.
- Tests run in node by default via `vite.config.ts` (`test.globals` on for testing-library cleanup); DOM interaction tests opt into happy-dom with a `@vitest-environment happy-dom` docblock. Coverage uses `@vitest/coverage-v8` (`coverage/` is gitignored).
- Lint currently passes with warnings related to fast-refresh export boundaries in generated/shared modules; resolve those warnings as follow-up work instead of guessing around them.

## High-level architecture

### What exists today

- `LICENSE`
  - MIT license grant for public reuse, modification, distribution, and warranty disclaimer
- `SECURITY.md`
  - private vulnerability reporting policy for auth, RLS, Edge Functions, Cloudflare Functions, provider-key storage, and privacy-sensitive flows
- `CONTRIBUTING.md`
  - contributor workflow, verification commands, OpenSpec/GEB documentation rules, PR expectations, and Conventional Commits format
- `CODE_OF_CONDUCT.md`
  - project collaboration standards and conduct-reporting boundary for a privacy-sensitive medical workflow
- `package.json`
  - npm script map for Vite dev/build, lint, app/node type-check, Cloudflare Pages Functions type-check, Supabase Edge Functions type-check, Vitest, and Capacitor mobile sync/open commands
- `capacitor.config.ts`
  - Capacitor 8 iOS/Android shell config using app id `com.ghibli1024.fireflyisle`, app name `一页萤屿`, and `dist` as the only web build source
- `README.en.md`
  - English project entrypoint mirroring the centered Chinese README surface for GitHub visitors
- `tsconfig.*.json`
  - TypeScript boundaries split by runtime: SPA app, Vite node config, Cloudflare Pages Functions, and Supabase Edge Functions
- `DESIGN.md`
  - project-level design-system entrypoint separating the V3 production source from the V4 evaluation source and migration boundary
- `docs/design/`
  - `Image-2/` — image-model redesign batches, including V3 production rules and the V4 Clinical Calm / Firefly Glass / Living Archive evaluation contract
  - `stitch/` — Stitch-origin design references and runtime screenshot evidence
- `docs/products/`
  - `prd-implementation-status.md` — current PRD implementation status, preserving the implemented / partial / not implemented feature audit
  - `product-priority-roadmap.md` — current product priority roadmap, separating completed OpenSpec milestones, archived P0/Demo baseline behavior, and next work such as WeChat auth
  - `archive/` — archived product snapshots: `prd.md`, `spec.md`, `design-system.md`, `stitch-screen-mapping.md`, and `product-goals-2026-05-05.md`; archived `design-system.md` is historical and must not override `DESIGN.md`, and archived goals are not the current execution queue
- `docs/operations/`
  - `clinical-workflow-release.md` — migration order, isolated database checks, deployment verification and compatibility boundary for clinical workflows
  - `capacitor-mobile-shell.md` — local Capacitor build/sync/open runbook, native project checks, platform-sensitive product-flow matrix, and signing-secret boundary
- `docs/log/`
  - `index.md` — commit history 总入口
  - `0001-*.md ~ 0022-*.md` — 每个 git commit 一份历史日志
  - `0023-auth-login-wechat-learning.md` — 认证学习专题复盘，记录邮箱/Google/Supabase/微信登录的原理、数据流、配置边界与排错路径
- `openspec/specs/`
  - current baseline requirements merged from archived MVP and commit-history changes
  - `CLAUDE.md` maps each baseline spec file and records that main specs must use `## Purpose` + `## Requirements`
- `openspec/changes/CLAUDE.md`
  - active/archive OpenSpec change map; update it when active change directories are created, archived, renamed, or removed
- `openspec/changes/archive/2026-05-16-add-lab-analytics-page/`
  - archived lab analytics artifacts for `/app` lab file input, `/analytics/:id`, Supabase lab batch/readings, grouped trends, abnormal summaries, and tumor-marker rise reminders
- `openspec/changes/archive/2026-05-16-add-clinical-ai-analysis/`
  - archived P0 artifacts for non-diagnostic AI treatment/lab analysis on `/record/:id`
- `openspec/changes/archive/2026-05-16-add-secure-record-sharing/`
  - archived P0 artifacts for `record_shares`, authorization-code hash storage, revocation/expiration, and public read-only `/share/:code`
- `openspec/changes/archive/2026-05-16-restore-minimal-timeline-table-view/`
  - archived P0 artifacts for restoring `TimelineTable` as the third `/record/:id` view without replacing dossier or Gantt export behavior
- `openspec/changes/archive/2026-05-16-make-demo-mode-cover-full-product/`
  - archived Demo artifacts for public `/demo` full-product showcase routes, page reminders, optional Supabase share-code Demo data, static AI/share previews, and real-workspace blank-state separation
- `openspec/changes/archive/2026-05-16-add-cross-platform-pwa-foundation/`
  - archived PWA foundation artifacts for Web App Manifest, install icons, privacy-first service worker caching, offline/weak-network boundaries, mobile safe-area/touch behavior, SPA deep-link fallback, and platform validation expectations
- `openspec/changes/archive/2026-05-16-add-capacitor-mobile-shell/`
  - archived Capacitor mobile shell artifacts for the iOS/Android wrapper, fixed app id/name, native platform projects, mobile sync/open scripts, signing-secret boundary, and local native tooling checks
- `openspec/changes/archive/2026-05-03-add-background-music-toggle/`
  - archived global background music toggle artifacts defining the app-level controller, shared UI entrypoint and autoplay boundary
- `openspec/changes/archive/2026-05-03-add-local-background-playlist/`
  - archived local playlist artifacts defining manifest-backed tracks, persisted selected track, compact previous/next controls and asset authorization boundary
- `openspec/changes/archive/2026-04-13-mvp-core/`
  - archived MVP implementation artifacts (proposal/design/specs/tasks)
- `openspec/changes/archive/2026-04-14-commit-history-log/`
  - archived docs/log governance artifacts (proposal/design/specs/tasks)
- `openspec/changes/archive/2026-04-23-unify-theme-system/`
  - archived theme-system unification artifacts (proposal/design/specs/tasks)
- `openspec/changes/archive/2026-04-23-refine-login-theme-entry/`
  - archived login theme-entry refinement artifacts (proposal/design/specs/tasks)
- `openspec/changes/archive/2026-04-28-separate-workspace-input-record-export/`
  - archived input/export ownership artifacts separating `/app` input/extraction from `/record/:id` formal PDF/PNG export
- `openspec/changes/archive/2026-04-29-refine-login-intro-drawer/`
  - archived login-entry artifacts defining the dual-theme project intro page and CTA-opened unified login overlay
- `openspec/changes/archive/2026-05-02-integrate-deepseek-api/`
  - archived LLM provider artifacts defining the Gemini / DeepSeek Edge Function proxy, JSON output mode, provider config and rollback boundary
- `.github/`
  - `PULL_REQUEST_TEMPLATE.md` — PR summary, verification, documentation, and Conventional Commits checklist
  - `workflows/*.yml` — GitHub Actions workflows for verification and explicit Cloudflare Pages deploy
- `public/`
  - static assets plus Cloudflare Pages `_headers` / `_redirects` deployment config
- `ios/`
  - Capacitor-generated iOS shell project; loads the existing Vite build and keeps Apple signing artifacts out of Git
- `android/`
  - Capacitor-generated Android shell project; loads the existing Vite build and keeps keystores/local Gradle artifacts out of Git
- `wrangler.jsonc`
  - Cloudflare Pages build config; public Vite vars include Supabase URL/anon key/Edge Function URL, optional public Demo share code, and a retained non-secret `custom:wechat` provider identifier for future WeChat work; server-side vars/bindings expose the WeChat OAuth adapter client id, callback URL, public base URL and short-lived KV namespace
- `functions/`
  - Cloudflare Pages Functions; currently contains WeChat OAuth2 adapter prework that can translate Supabase custom provider requests into WeChat Open Platform QR login, while the active login page keeps WeChat as `敬请期待`
- `scripts/check-clinical-workflows.sh`
  - `npm run test:database` runs real migrations and behavior checks in a disposable, network-isolated PostgreSQL container with synthetic data
- `supabase/`
  - `migrations/*.sql` — schema, RLS, trigger, record sharing, and storage-adjacent infrastructure migrations
- `src/components/analytics/`
  - analytics UI module for the lab statistics page, rendering grouped lab trends, chart-equivalent tables, demo lab data, abnormal summaries, tumor-marker rise reminders, and non-diagnostic messaging
- Global Claude OpenSpec helpers
  - `~/.claude/skills/openspec-*` and `~/.claude/commands/opsx/*` provide reusable Claude Code workflow helpers

### Current product architecture

- **Frontend:** Vite + React 18 + TypeScript SPA
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Backend/BaaS:** Supabase Auth + PostgreSQL + RLS + Edge Functions
- **Mobile shell:** Capacitor 8 iOS/Android wrapper around the same `dist` Web build; no separate native product UI or local patient-record truth source
- **Edge adapter:** Cloudflare Pages Functions host WeChat OAuth2 adapter prework for future Supabase custom provider compatibility; current login UI keeps WeChat deferred
- **SaaS substrate (2026-09-02 refactor):** `profiles` (migration 007, auto-provision trigger) backs `/settings`; `usage_events` (009, owner read-only + `record_usage` RPC) backs dual-layer rate limits in `llm-proxy` / `medical-document-ocr` via `supabase/functions/_shared/usage-limits.ts`; `plans` + `subscriptions` (010) plus `billing-checkout` / `stripe-webhook` functions form the Stripe-ready billing base, all env-gated and fail-closed when unconfigured. `llm-proxy` resolves the caller's plan quota (`resolvePlanQuota`, 30-day rolling window) before the window rate limit and returns 429 when the monthly quota is exhausted; plan lookup errors fail open to window limiting
- **Account & privacy:** `/settings` shows identity, display name, locale/theme preferences (degrades to local-only without profiles), JSON data export (`src/lib/account-data-export.ts`, excludes key ciphertext and share-code hashes) and type-to-confirm account deletion (`delete_own_account` RPC, migration 008; every user table cascades from `auth.users`)
- **Follow-up and symptoms:** `/record/:id/follow-up` and `/record/:id/side-effects` share patient-scoped navigation, recoverable forms and deletion confirmation. Migration `20260912051552_clinical_workflow_integrity.sql` adds owner defaults, patient/treatment-line ownership checks and invoker Dashboard RPCs; date-only values use `calendar-date.ts`.
- **Side-effect log:** `/record/:id/side-effects` is the patient symptom log (migration `012_side_effects`, owner CRUD RLS, optional treatment-line attribution via `TreatmentLine.id`); it is an auxiliary record — non-diagnostic, linked from the record page toolbar
- **Model settings:** `/models` is the standalone model configuration page — it renders the declarative model catalog in `src/lib/model-catalog.ts` (protocol aligned with the Codex++ catalog: slug / displayName / inputModalities / priority / visibility; text default `deepseek-v4-flash`, image default `deepseek-v4-image`) and hosts the bring-your-own-key provider panel migrated out of the workspace composer; the composer links to it instead
- **OCR boundary:** `medical-document-ocr` routes images to the DeepSeek v4 image model by default (`OCR_PROVIDER=deepseek`, `DEEPSEEK_OCR_MODEL=deepseek-v4-image`, chat-completions `image_url` parts); Gemini stays as the `OCR_PROVIDER=gemini` fallback and is the only path accepting PDF input
- **Dashboard:** `/dashboard` is the authenticated landing route with exact counts (records, lab readings, active shares, 30d AI calls from `usage_events`), the latest record, latest readings per patient/category/item code before abnormal filtering, latest-visit plans including overdue dates, independent section failures and an actionable empty state; `/` redirects there for authenticated users
- **Observability:** `src/lib/error-reporting.ts` forwards sanitized window errors to `VITE_ERROR_REPORT_URL` (no-op when unset); `supabase/functions/_shared/logger.ts` emits single-line JSON logs on upstream failure, timeout and rate-limit paths
- **AI boundary:** frontend calls a Supabase Edge Function proxy; system provider keys stay server-side, and user-owned provider keys are saved only through encrypted `llm_provider_settings` rows
- **Core workflow:** natural-language intake → structured extraction → up to 3 clarification rounds → timeline table render → inline editing → formal record page → AI auxiliary analysis / read-only sharing / PDF/PNG export
- **Demo workflow:** public `/demo` routes remain directly accessible; the login page no longer exposes a Demo CTA; Demo pages reuse the real record and analytics surfaces with a visible Demo reminder, optional Supabase public share-code record, unified sample patient/lab fallback data, static non-diagnostic AI analysis preview, disabled share preview and client-side export, without creating Supabase records from Demo
- **Privacy boundary:** first-use privacy gate and `/privacy` page share the same text source in `src/lib/privacy.ts`
- **Current truth sources:** behavior lives in `openspec/specs/**/*.md`; visual ownership starts at `DESIGN.md`, with V3 as production and V4 as evaluation only; implementation details live in `src/`, `supabase/`, `.github/`, and `public/`; archive change designs are historical rationale, not the primary current-state entrypoint

### Core domain model

The app revolves around a `PatientRecord` with treatment history layers plus an independent lab trend collection:

1. `basicInfo` — demographics and diagnosis summary
2. `initialOnset` — optional early-stage/initial treatment block
3. `treatmentLines[]` — ordered advanced-treatment lines
4. `labResults[]` — optional repeated blood routine, blood biochemistry, and tumor-marker readings, kept independent from treatment lines

Rendering depends on three patient archetypes:

- `non-advanced` — basic info + initial onset only
- `de-novo-advanced` — basic info + treatment lines only
- `relapsed-advanced` — basic info + initial onset + treatment lines

Important domain rules from the specs:

- Basic info always renders first.
- `initialOnset` is shown only when present.
- `treatmentLines` are ordered by `lineNumber`.
- `labResults` are grouped by lab indicator and rendered as non-diagnostic trends.
- Immunohistochemistry and genetic-test data stay attached to each onset/treatment line, not in a shared summary section.
- Clinically important missing fields (`tumorType`, `stage`, `regimen`) should be visually highlighted for manual completion.

## Document hierarchy

When implementation starts, read these in roughly this order:

1. `README.md` — concise project purpose and current repo baseline
2. `docs/products/prd-implementation-status.md` — current PRD implementation status and pointers to archived product docs
3. `DESIGN.md` — project-level visual-system entrypoint, separating the active V3 production source from the isolated V4 evaluation source
4. `docs/products/archive/prd.md` — archived original user/problem framing and scope boundaries, when historical PRD context is needed
5. `openspec/specs/**/*.md` — current baseline behavior requirements
6. `src/**`, `supabase/**`, `.github/**`, `public/**` — current implementation reality and runtime boundaries
7. `openspec/changes/archive/**/design.md` — historical rationale only, when current behavior or past decisions need explanation

## Current architectural direction

The OpenSpec artifacts are aligned on these points:

- MVP keeps a thin `chat(messages, options)` adapter boundary.
- The LLM proxy supports system DeepSeek fallback plus user-owned Gemini, Claude, OpenAI, GLM, DeepSeek, Kimi, and custom OpenAI-style provider settings through a Supabase Edge Function boundary.
- The app now provides a user-facing LLM provider settings entry: no saved setting falls back to system DeepSeek, while user-owned preset/custom provider keys are saved through `llm-proxy/settings` with server-side encryption and RLS-backed storage.
- Data storage uses normalized `patients` + `treatment_lines` + `lab_report_batches` + `lab_results` tables with RLS; `lab_results` remains the single reading truth for web charts and monitoring, while `lab_report_batches` stores upload/OCR/review source facts.
- Read-only sharing uses `record_shares` with hashed authorization codes, revocation/expiration, active-share RLS, and a public `/share/:code` route that never exposes raw owner user ids.
- Lab analytics, clinical AI analysis, record sharing, TimelineTable, full-product Demo, and PWA foundation have been archived into baseline specs; future work should create new OpenSpec changes instead of editing archived contracts as active ledgers.

## Stitch note

If future work uses the archived Stitch artifacts in `docs/products/archive/stitch-screen-mapping.md`, treat `screenInstances.label` as the authoritative page name. Do not use `project.title` or `list_screens.title` as the source of truth.

## Working conventions already present

- Follow the spec-first workflow already encoded in the repo: adjust specs before implementing when requirements change.
- PR titles and squash-merge commit messages should follow Conventional Commits: `<type>[optional scope]: <description>`.
- Commit granularity should follow OpenSpec/change boundaries. The repository default is to commit at completed Step boundaries, but if the active change documents a more specific recommended commit map, follow that map.
- Tasks are execution checklists, not an instruction to create one commit per checkbox.
- Only commit after the tests relevant to the commit's scope pass.
- Once code exists, keep repository documentation aligned with structural changes.
