## Why

The current demo is split across `/record/demo` and `/analytics/demo`, while the authenticated workspace still falls back to those pages through navigation. That makes it hard to use Demo as a complete investor/tutorial/debug surface and too easy to confuse real blank user state with sample data.

## What Changes

- Add a first-class full-product Demo mode with a stable login-page entry and public route entry that covers the main product surfaces: record dossier, TimelineTable, Gantt, lab analytics, AI analysis preview, share preview, and export affordances.
- Keep real authenticated and anonymous `/app` sessions blank until the user creates or imports their own record; the app may link to Demo, but it SHALL NOT seed sample data into a real user workspace by default.
- Unify Demo record and Demo analytics around one semantic demo patient so lab trends and treatment lines tell the same story, loading a configured public Supabase share-code record when available and falling back to the local fixture otherwise.
- Make Demo safe for investors/tutorial use: read-only by default, explicit page-level demo reminders, no real Supabase writes from Demo, no provider-key exposure, and no fake diagnosis or treatment recommendation.
- Preserve the normal real-record paths for AI analysis, sharing, editing, persistence, Gantt, TimelineTable, and PDF/PNG export.

## Capabilities

### New Capabilities
- `demo-mode`: Full-product Demo mode, including login-page/public demo entry, demo navigation, read-only showcase behavior, optional Supabase-backed public demo data, static AI/share previews, and real-workspace blank-state separation.

### Modified Capabilities
- `auth`: Public Demo routes SHALL be reachable without creating or restoring a Supabase session, while real `/app`, `/record/:id`, and `/analytics/:id` remain protected.
- `app-shell`: Authenticated shell navigation SHALL distinguish real record/statistics routes from Demo entrypoints when no real record exists.

## Impact

- Affected frontend routes: `src/App.tsx`, `src/routes/login-page.tsx`, `src/routes/record-page.tsx`, `src/routes/record-page.view.tsx`, `src/routes/lab-analytics-page.tsx`, and the new Demo entry route if needed.
- Affected shared UI/data: login entry CTA, app shell navigation, demo mode banner, optional demo share-code data loader, demo fixture data, record dossier AI/share panels, analytics dashboard.
- Affected tests: login Demo CTA, route protection, demo route rendering, real blank-state navigation, record demo coverage, analytics demo coverage.
- Affected docs: OpenSpec change map, product roadmap/status, and project maps, module maps, and file contracts for route and demo fixture ownership changes.
