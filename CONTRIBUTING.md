# Contributing to Firefly-Isle

Thank you for helping improve Firefly-Isle. The project is small, privacy
sensitive, so changes should be narrow, tested, and documented.

## Development Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Fill the Supabase and Edge Function variables described in `README.md` before
testing authentication, persistence, or LLM-backed extraction.

## Verification: Incremental by Default

Choose checks by impact, not by the number of edited files. A local edit or
commit does not automatically require the full suite. Reuse passing evidence
until a later change affects it.

| Change | Local verification |
| --- | --- |
| Documentation only | Review facts, links and affected maps; no product tests/build. |
| Local logic or bug fix | The module's tests and affected callers; lint edited code and type-check its runtime. Add a regression for the reproduced bug. |
| Page, copy or styles | Relevant existing interaction/contract tests and a focused browser check; check long content or narrow screens when affected. Do not add tests solely to freeze wording or CSS values. |
| Database, permissions or transactions | Relevant behavior tests plus isolated database checks; mocks do not prove RLS or transaction behavior. |
| Dependencies, build/test configuration, broad core refactor or uncertain impact | Full tests, relevant type/lint checks and build. |

Examples, run from the repository root:

```bash
# Explicit selection is the most predictable option; accepts several files.
npm test -- src/lib/calendar-date.test.ts

# Follow module imports from changed source files to related tests.
npm run test:related -- src/lib/calendar-date.ts

# Select affected tests from uncommitted changes.
npm run test:changed
# To compare against a known commit instead:
npm test -- --changed=HEAD~1

# Keep feedback scoped while editing.
npm run test:watch -- src/lib/calendar-date.test.ts

# Lint edited code; type-check the affected runtime using config/tsconfig.*.json.
npm exec -- eslint src/lib/calendar-date.ts src/lib/calendar-date.test.ts
npm run type-check:app
```

`changed` and `related` use the module dependency graph. Tests that read source
with `readFile`, plus CSS, SQL, static assets and indirect configuration inputs,
may not appear in that graph: explicitly include their contract/behavior tests.
Inspect the selected files and count. Zero selected tests is not a passing
validation result. The installed Vitest defaults force a full selection when `package.json` or
Vite/Vitest configuration changes. For a scripts-only edit with a known narrow
scope, use explicit `npm test -- path/to/file.test.ts` selection instead of
`test:changed`; dependencies or global test behavior changes still need full checks.
`--changed` compares uncommitted changes by default; it is not a record of the last
successful test run, and a clean committed tree needs an explicit comparison base.

CI remains the integration safety net: it runs the full suite with coverage,
lint, runtime type checks, database checks and a build on its existing triggers.
Local full runs use `npm test`; coverage is for CI or investigating gaps, not a
mandatory local step. Do not run both full test and full coverage consecutively
without a reason. The same applies to repeating full local checks solely because
CI will run them again.

Preserve tests for observable workflows, account isolation, persistence,
concurrency and known regressions. Static checks are useful for otherwise hard
to exercise security/asset contracts, but exact implementation-text assertions
should not substitute for behavior tests. Consolidate redundant checks as their
modules change; do not delete tests merely to reduce the count or chase coverage.

Before a PR, record the selected checks and their results, including why an
expensive or inapplicable check was omitted. UI behavior changes need a focused
browser check. A local pass is not evidence of production deployment.

## Files and Configuration

- Keep development and build configuration in `config/`; root discovery files
  should stay thin. Run the documented npm scripts, which select the Vite/Vitest
  configuration explicitly.
- Name new business modules by their responsibility using kebab-case, for example
  `extraction-prompt.ts`. React component exports use PascalCase. Existing clear
  PascalCase component filenames do not need cosmetic renames.
- Put `*.test.ts` / `*.test.tsx` beside their module; use `.dom.test.tsx` when the
  distinction helps identify browser interaction tests. Application assembly
  checks live beside `App.tsx`, and native-shell checks live in `mobile/`.
- Name production styles by their role, such as `motion.css`; avoid names that
  imply they are development-only. Preserve tool-defined entrypoint names.

## Spec and Documentation Rules

- Use OpenSpec for confirmed feature behavior, permission/data contracts and
  user-flow changes. Styling, behavior-preserving structural cleanup,
  documentation and local fixes do not require a full planning workflow.
- Verify specs against current implementation and acceptance evidence. Older
  contracts and archived plans do not override the owner's latest direction.
  Keep one task ledger per change; avoid duplicate planning frameworks.
- Structural changes must update the nearest `AGENTS.md`.
- Source files with dependency, export, or responsibility changes must keep
  their INPUT / OUTPUT / POS header contract aligned with the implementation.
- `AGENTS.md` is the only project/module instruction file used here. Do not
  create tool-specific compatibility import files or duplicate map bodies.
- Read the applicable ancestor maps before editing; update L3, then the
  affected L2, and L1 only when project structure or conventions change.
- Generated/third-party files and lockfiles do not need source headers.
  Read-only checks do not trigger documentation writes.
- Archived OpenSpec changes are evidence, not the current source of truth.

## Pull Request Rules

Keep PRs focused on one product or infrastructure concern. A good PR explains:

- What changed.
- Why it changed.
- How it was verified.
- Which specs, maps, migrations, or deployment settings were touched.

Use draft PRs for incomplete work. Mark a PR ready only after relevant checks
pass and the docs reflect the code.

## Commit and PR Title Format

Use Conventional Commits for PR titles and squash-merge commit messages:

```text
<type>[optional scope]: <description>
```

Recommended types:

- `feat`: user-visible feature.
- `fix`: bug fix.
- `docs`: documentation-only change.
- `refactor`: behavior-preserving code structure change.
- `test`: test-only change.
- `ci`: GitHub Actions or deployment pipeline change.
- `build`: dependency, bundler, or build configuration change.
- `chore`: maintenance that does not affect runtime behavior.

Examples:

```text
feat(provider-settings): add user-owned Kimi preset
fix(auth): preserve session after privacy gate redirect
docs(governance): add community health files
ci(pages): require main ancestry before deploy
```

Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.

## Privacy and Security

Never commit secrets, provider keys, private patient data, or exported records.
Use `.env.local`, `.dev.vars`, Supabase secrets, and Cloudflare secrets for
runtime credentials. Report vulnerabilities through `SECURITY.md` instead of a
public issue.
