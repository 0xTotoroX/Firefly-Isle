## Context

Firefly-Isle already has rich product surfaces, but Demo behavior is split across implementation details:

- `/record/demo` renders a demo record, but it is mounted behind the authenticated `/record/:id` guard.
- `/analytics/demo` renders lab trends from a separate fixture and is also behind the authenticated analytics guard.
- `/app` correctly starts empty for real users, but the sidebar currently uses demo record/statistics as fallback destinations without naming that as a separate mode.
- P0 added AI analysis and sharing to real records, while demo routes deliberately avoid real LLM calls and real `record_shares` writes.

The product need is different from the current shape: Demo should be a first-class product mode for investors, tutorial use, and debugging, while real authenticated/anonymous sessions remain blank until they create their own records.

## Goals / Non-Goals

**Goals:**

- Provide a public Demo path that requires no Supabase session.
- Provide a login-page Demo button so investors, tutorial readers, and debugging sessions can enter Demo without first creating an account.
- Let Demo cover the full product story: dossier, TimelineTable, Gantt, lab trends, AI analysis preview, share preview, and export affordances.
- Keep Demo explicitly labeled on every Demo page.
- Load a configured public Supabase share-code record for Demo when available, while keeping a local fixture fallback for development and broken-network states.
- Keep Demo read-only against Supabase; it must not seed or mutate real user-owned data by default.
- Keep real `/app` blank when no user-owned record exists.
- Preserve real AI analysis, sharing, editing, export, `/record/:id`, `/analytics/:id`, `/share/:code`, and `/app` behavior.

**Non-Goals:**

- Do not implement a guided onboarding tour in this change.
- Do not create a “copy demo into my workspace” sandbox write flow yet.
- Do not call the live LLM proxy from public Demo by default.
- Do not generate real authorization codes or `record_shares` rows from Demo.
- Do not change Supabase RLS, patient ownership, or provider-key storage.
- Do not make new anonymous or newly registered accounts inherit Demo data.

## Decisions

### Decision 1: Public Demo routes use the real page components

Demo SHALL be mounted through public `/demo`, `/demo/record`, and `/demo/analytics` routes. `/demo` may redirect to the first real demo surface instead of becoming a marketing landing page.

Rationale: the first screen should be the usable product, not a brochure. Reusing `RecordPage` and `LabAnalyticsPage` keeps the demo honest because regressions in real product surfaces are visible in Demo too.

Alternative considered: build a separate demo landing/tutorial page. Rejected for now because it would be another surface to maintain and would not prove the real product workflow.

### Decision 2: The login page is the primary human entry into Demo

The login page SHALL render a visible Demo CTA next to the authentication CTA. The CTA SHALL route directly to `/demo/record` and SHALL NOT open the auth overlay.

Rationale: Demo is a product surface for investors, tutorials, and development. Hiding it behind an authenticated shell makes the real blank-state behavior feel broken and forces demos through account creation.

Alternative considered: keep Demo discoverable only from no-record sidebar fallback. Rejected because users who are not logged in would not know the product is explorable.

### Decision 3: Demo has an optional Supabase read source and a local fallback

Demo SHALL prefer a configured public share authorization code, `VITE_DEMO_RECORD_SHARE_CODE`, and use the existing read-only sharing boundary to load the public demo `PatientRecord` from Supabase. If the env var is absent, invalid, expired, revoked, unavailable, or the network read fails, Demo SHALL fall back to the local frontend fixture.

Rationale: this matches the product mental model of a real public demo account while reusing the already-reviewed share-code/RLS boundary. The local fallback keeps local development, browser tests, and investor demos resilient when Supabase is not configured.

Alternative considered: auto-create a demo record for each session. Rejected because it blurs the user-owned data boundary and requires RLS/storage cleanup behavior that belongs to a later sandbox feature.

### Decision 4: Demo is read-mostly and never seeded into user storage

The Demo patient record, lab results, static AI analysis result, and share preview SHALL remain read-only against Supabase. Demo editing may remain local and ephemeral for debugging, but no Demo action shall write patients, lab_results, LLM analysis, or record_shares to Supabase by default.

Rationale: investor/tutorial Demo must be safe to open publicly, and real/anonymous sessions must not be polluted by sample data.

### Decision 5: Every Demo page carries a visible Demo reminder

Record and analytics Demo pages SHALL render a compact banner that says the user is viewing public Demo data and that changes do not write into their personal workspace.

Rationale: the mode boundary should be visible inside the page, not only encoded in the URL, because screenshots, browser history, and guided walkthroughs may hide the route.

### Decision 6: Demo AI and sharing are previews, while real routes keep live behavior

Public Demo SHALL show a static non-diagnostic AI analysis preview and a disabled share-management preview. Real `/record/:id` SHALL keep using the existing `llm-proxy` and `record_shares` paths.

Rationale: this covers the feature visually without leaking provider keys, spending tokens for public visitors, or creating fake authorization codes.

Alternative considered: call the live AI proxy from Demo. Rejected because it creates cost/abuse risk and may imply demo content is patient-specific medical advice.

### Decision 7: Sidebar fallback should name Demo as Demo

When no real record exists, sidebar record/statistics destinations SHALL point to public Demo paths rather than authenticated `/record/demo` or `/analytics/demo` paths. When a real record exists, the sidebar SHALL keep linking to `/record/:id` and `/analytics/:id`.

Rationale: the empty real workspace stays true, while Demo remains discoverable as a separate mode.

Alternative considered: keep existing fallback routes. Rejected because it hides the important boundary between user data and sample data.

## Risks / Trade-offs

- Public Demo could be mistaken for real patient state -> Demo routes and panels must use explicit demo/preview wording and avoid writes.
- Public Demo share code could expire or be revoked -> fallback to local fixture and keep the route usable, but label the data as Demo either way.
- Reusing real page components may expose private actions in public routes -> pass demo/public route flags through route orchestration and disable real AI/share writes.
- Static AI preview may look less “live” than a real model call -> label it as an example analysis and reserve live generation for real records.
- Allowing PDF/PNG export in Demo increases browser work -> export remains client-side only and uses existing lazy-loaded export code.

## Migration Plan

1. Add OpenSpec specs and tasks for Demo mode, auth route boundary, and app-shell navigation.
2. Mount public Demo routes in `src/App.tsx` and add a login-page Demo CTA.
3. Adjust record/analytics route orchestration so public Demo uses Demo links, a shared Demo banner, and optional Supabase share-code data with fixture fallback.
4. Add static Demo analysis/share preview and allow client-side export for Demo.
5. Update focused tests, architecture docs, and product docs.
6. Validate with OpenSpec, route tests, type-check, lint, full tests, build, and browser checks for `/login`, `/demo/record`, and `/demo/analytics`.
