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

## Before Opening a Pull Request

Run the checks that match your change:

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

Documentation-only changes do not need a browser smoke test, but they should
still keep the repository maps accurate.

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
