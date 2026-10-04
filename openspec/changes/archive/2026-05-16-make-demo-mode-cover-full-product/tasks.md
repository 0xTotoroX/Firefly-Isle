## 1. Demo Route Contract

- [x] 1.1 Mount public `/demo`, `/demo/record`, and `/demo/analytics` routes without requiring authentication.
- [x] 1.2 Keep real `/app`, non-demo `/record/:id`, non-demo `/analytics/:id`, and `/share/:code` route boundaries intact.
- [x] 1.3 Add a visible login-page Demo CTA that navigates to `/demo/record` without opening authentication.

## 2. Unified Demo Data And Panels

- [x] 2.1 Reuse one semantic Demo patient record with labResults across record and analytics Demo pages.
- [x] 2.2 Add static non-diagnostic AI analysis preview for Demo without calling `llm-proxy`.
- [x] 2.3 Add disabled share preview for Demo without creating `record_shares`.
- [x] 2.4 Allow client-side PDF/PNG export from Demo while keeping real export behavior unchanged.
- [x] 2.5 Prefer a configured public Supabase share-code Demo record via `VITE_DEMO_RECORD_SHARE_CODE`, with local fixture fallback on missing/invalid/unavailable data.

## 3. Shell Navigation And Blank Real State

- [x] 3.1 Point no-record sidebar fallback links to public Demo routes.
- [x] 3.2 Keep user-owned record/statistics links pointing to real `/record/:id` and `/analytics/:id` when a record exists.
- [x] 3.3 Keep `/app` empty for real authenticated or anonymous users who have not created/imported a record.
- [x] 3.4 Render an explicit Demo-mode reminder on every Demo page.

## 4. Tests And Docs

- [x] 4.1 Add/update app route, workspace shell, record Demo, analytics Demo, and share/AI preview tests.
- [x] 4.2 Update project maps, module maps, and file contracts for changed route, shell, record, analytics, and OpenSpec ownership.
- [x] 4.3 Update product status/roadmap docs to record Demo as a full-product showcase/debug/tutorial mode.
- [x] 4.4 Run focused validation, then `openspec validate --all`, type-checks, lint, full tests, and build.
- [x] 4.5 Update tests/docs for login CTA, Demo banner, optional Supabase Demo source, and rerun focused/full validation.
